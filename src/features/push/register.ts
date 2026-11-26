import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import { queryClient } from "../../api/cache";
import { deleteDevice, getCurrentDevice, registerDevice } from "../../api/devices";
import { isApiError } from "../../api/errors";
import { keys } from "../../api/keys";
import { sessionQuery } from "../../api/queries/session";
import type { Device } from "../../api/types";
import { t } from "../../lib/i18n";
import { usePush } from "../../state/push";
import { pushBuild } from "./config";

/** The Android channel the server names in every push (`channelId: "mail"`). */
export const MAIL_CHANNEL = "mail";

/**
 * Creates (or renames) the "mail" channel. Android shows no notification for a channel that does
 * not exist, and on Android 13+ the permission prompt needs a channel first, so this runs before
 * the prompt, before a token is requested and at every start with push on. Only the name and the
 * description of an existing channel can change; the user's own channel settings stay.
 */
export async function ensureMailChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(MAIL_CHANNEL, {
    name: t.pushChannelName,
    description: t.pushChannelDescription,
    importance: AndroidImportance.HIGH,
  });
}

/**
 * In the foreground the app shows no system notification: the event stream refreshes the lists
 * already (README, "Events").
 */
export function silenceForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** The token could not be obtained (no Google Play services, no network, Firebase setup). */
export class PushTokenError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "PushTokenError";
  }
}

async function expoPushToken(): Promise<string> {
  const { projectId } = pushBuild();
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (err) {
    throw new PushTokenError(err);
  }
}

/** POST /devices with a fresh token; remembers the device (local id, query cache). */
async function register(accountIds: string[] | null): Promise<Device> {
  const pushToken = await expoPushToken();
  const device = await registerDevice({ provider: "expo", pushToken, accountIds });
  usePush.setState({ deviceId: device.id });
  queryClient.setQueryData(keys.pushDevice, device);
  return device;
}

/** One registration at a time (start-up, token rotation and the settings may overlap). */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * The switch in the settings: channel, then the system permission (Android 13+ asks), then the
 * token and POST /devices. "denied" leaves push off; API and token errors are thrown (push stays
 * off as well).
 */
export function enablePush(accountIds: string[] | null): Promise<"enabled" | "denied"> {
  return serial(async () => {
    await ensureMailChannel();
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return "denied";
    await register(accountIds);
    usePush.setState({ enabled: true, accountIds });
    return "enabled";
  });
}

/** Switches push off: DELETE /devices/{id} (already gone counts as done). */
export function disablePush(): Promise<void> {
  return serial(async () => {
    let id = usePush.getState().deviceId;
    if (!id) {
      try {
        id = (await getCurrentDevice()).id;
      } catch (err) {
        if (!isApiError(err, 404)) throw err;
      }
    }
    if (id) {
      try {
        await deleteDevice(id);
      } catch (err) {
        if (!isApiError(err, 404)) throw err;
      }
    }
    usePush.setState({ enabled: false, deviceId: null });
    queryClient.removeQueries({ queryKey: keys.pushDevice });
  });
}

/** Changes the accounts that are notified (null: all): POST /devices again. */
export function setPushAccounts(accountIds: string[] | null): Promise<void> {
  return serial(async () => {
    await register(accountIds);
    usePush.setState({ accountIds });
  });
}

/** The device (FCM) token the listener saw last in this app run. */
let lastDeviceToken: string | null = null;

/**
 * The push token listener. Every native token fetch also emits the token, getExpoPushTokenAsync
 * of our own registrations included, so only a token that differs from the one seen before in
 * this run is a rotation: that registers once (and the event of that registration is the same
 * token again). The first event of a run only records the token.
 */
export function onDevicePushToken(token: Notifications.DevicePushToken): void {
  const value = typeof token.data === "string" ? token.data : JSON.stringify(token.data);
  const previous = lastDeviceToken;
  lastDeviceToken = value;
  if (previous !== null && previous !== value) void registerAgain();
}

/** Test helper: a new app run (no device token seen). */
export function resetDeviceTokenForTests(): void {
  lastDeviceToken = null;
}

/**
 * Registers the device again when push is on here: at start-up, after sign-in, after the token
 * rotated and when the server no longer knows the device (404, e.g. Expo reported the token as
 * not registered). POST /devices is idempotent. It never asks for the permission: if the user
 * took it away in the system settings, push is switched off here (and on the server).
 * Failures are only logged; the next start tries again.
 */
export function registerAgain(): Promise<void> {
  return serial(async () => {
    const { enabled, accountIds } = usePush.getState();
    if (!enabled) return;
    try {
      await ensureMailChannel();
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        const id = usePush.getState().deviceId;
        usePush.setState({ enabled: false, deviceId: null });
        queryClient.removeQueries({ queryKey: keys.pushDevice });
        if (id) await deleteDevice(id).catch(() => undefined);
        return;
      }
      try {
        await register(accountIds);
      } catch (err) {
        // An account chosen here was removed (in silo-web, say): keep the ones that remain.
        if (!accountIds || !isApiError(err, 422) || err.code !== "invalid_account") throw err;
        const session = await queryClient.fetchQuery(sessionQuery);
        const remaining = accountIds.filter((id) => session.accounts?.some((a) => a.id === id));
        if (!remaining.length || remaining.length === accountIds.length) throw err;
        await register(remaining);
        usePush.setState({ accountIds: remaining });
      }
    } catch (err) {
      console.warn("Push registration failed", err);
    }
  });
}
