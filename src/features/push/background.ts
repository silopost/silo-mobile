import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { handleRemotePush } from "./present";

/**
 * The background notification task (ADR 0016, update 2026-11-26). expo-notifications runs it for
 * every FCM data message, also when the app is in the background or its process was killed
 * (expo-task-manager then starts the JS bundle without a screen); it presents the new-mail
 * notification from the user's own server (present.ts). Defined and registered when this module
 * is first imported, which the entry (index.ts) does before anything else: a process started for
 * the task has no screen that would import it later.
 */
export const MAIL_PUSH_TASK = "silo-mail-push";

TaskManager.defineTask<Notifications.NotificationTaskPayload>(MAIL_PUSH_TASK, async ({ data }) => {
  try {
    await handleRemotePush(data);
  } catch (err) {
    console.warn("Mail push task failed", err);
  }
});

/**
 * Resolves true once the task is registered (Android builds with expo-task-manager); false in
 * Expo Go, on iOS for now, or when the native module is missing. Only then does the app register
 * its device for data-only pushes (register.ts): a push without a title that nobody presents
 * would show nothing at all.
 */
export const backgroundTaskReady: Promise<boolean> =
  Platform.OS === "android"
    ? Notifications.registerTaskAsync(MAIL_PUSH_TASK).then(
        () => true,
        (err: unknown) => {
          console.warn("Mail push task not registered", err);
          return false;
        },
      )
    : Promise.resolve(false);
