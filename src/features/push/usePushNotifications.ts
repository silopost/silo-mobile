import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { queryClient } from "../../api/cache";
import { metaQuery } from "../../api/queries/meta";
import { sessionQuery } from "../../api/queries/session";
import { useAuth } from "../../state/auth";
import { usePush } from "../../state/push";
import { pushBuild, pushUnavailable, type PushUnavailable } from "./config";
import { onDevicePushToken, registerAgain } from "./register";
import { mailPushHref, parseMailPush } from "./route";

/** Why push cannot be used with the signed-in instance and this build; null when it can. */
export function usePushUnavailable(): PushUnavailable | null {
  const serverUrl = useAuth((s) => s.serverUrl) ?? "";
  const meta = useQuery({ ...metaQuery(serverUrl), enabled: !!serverUrl });
  return pushUnavailable(meta.data, pushBuild());
}

/** Opens what a tapped mail push points at; anything else opens the app as it is. */
async function openNotification(
  response: Notifications.NotificationResponse,
  navigate: (href: string) => void,
): Promise<void> {
  Notifications.clearLastNotificationResponse();
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const push = parseMailPush(response.notification.request.content.data);
  if (!push || useAuth.getState().status !== "signedIn") return;
  try {
    const session = await queryClient.fetchQuery(sessionQuery);
    const href = mailPushHref(push, session.accounts ?? []);
    if (href) navigate(href);
  } catch {
    // Offline or signed out meanwhile: the app opens where it is.
  }
}

/**
 * Push while signed in (mounted by the (app) layout): with push switched on here and usable, the
 * device is registered again at start-up and after sign-in (POST /devices is idempotent and
 * restores a device the server removed) and again whenever the push token rotates. Taps on a
 * notification, also the one that started the app, open the thread or the Inbox.
 */
export function usePushNotifications(): void {
  const status = useAuth((s) => s.status);
  const serverUrl = useAuth((s) => s.serverUrl);
  // The stored choice is read from AsyncStorage asynchronously.
  const hydrated = useSyncExternalStore(
    usePush.persist.onFinishHydration,
    usePush.persist.hasHydrated,
  );
  const unavailable = usePushUnavailable();
  const usable = status === "signedIn" && hydrated && unavailable === null;
  const router = useRouter();
  const pathname = usePathname();
  // A tap is opened once the start screen has redirected: "/" redirects to the Inbox of the
  // default account, which would cover a thread opened from a cold start.
  const atStart = useRef(pathname === "/");
  const pending = useRef<string | null>(null);
  useEffect(() => {
    atStart.current = pathname === "/";
    const href = pending.current;
    if (atStart.current || !href) return;
    pending.current = null;
    router.push(href);
  }, [pathname, router]);

  // Not keyed on the switch itself: switching on in the settings registers already.
  useEffect(() => {
    if (!usable) return;
    void registerAgain();
    const subscription = Notifications.addPushTokenListener(onDevicePushToken);
    return () => subscription.remove();
  }, [usable, serverUrl]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "signedOut") {
      // A tap from before sign-out must not open anything after the next sign-in, and the
      // notifications show mail (sender, subject, snippet): none stays after sign-out.
      Notifications.clearLastNotificationResponse();
      Notifications.dismissAllNotificationsAsync().catch(() => undefined);
      return;
    }
    const open = (href: string) => {
      if (atStart.current) pending.current = href;
      else router.push(href);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) void openNotification(last, open);
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => void openNotification(response, open),
    );
    return () => subscription.remove();
  }, [status, router]);
}
