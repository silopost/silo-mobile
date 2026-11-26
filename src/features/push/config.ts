import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { hasServerPush, type MetaMaybePush } from "../../lib/features";

/** The Android channel of new-mail notifications (the server names it in every push). */
export const MAIL_CHANNEL = "mail";

/** What this build knows about push (app.config.js → `extra`). */
export type PushBuild = {
  /** The Expo project push tokens are issued for (SILO_EAS_PROJECT_ID). */
  projectId: string | undefined;
  /** An Android build with google-services.json (SILO_GOOGLE_SERVICES_JSON). */
  fcm: boolean;
  /** Expo Go: remote notifications are unavailable there on Android since SDK 53. */
  expoGo: boolean;
};

type Extra = { eas?: { projectId?: unknown }; push?: { fcm?: unknown } };

/** Reads the push configuration this app was built (or started) with. */
export function pushBuild(): PushBuild {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  const projectId = extra.eas?.projectId ?? Constants.easConfig?.projectId;
  return {
    projectId: typeof projectId === "string" && projectId ? projectId : undefined,
    fcm: extra.push?.fcm === true,
    expoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  };
}

/**
 * Why push cannot be switched on: the server does not push (`server`: an older server, or
 * `push.providers` without "expo"), the build has no push configuration (`build`), or the app
 * runs in Expo Go (`expoGo`). The server is checked first: a build setting does not help there.
 */
export type PushUnavailable = "loading" | "server" | "build" | "expoGo";

export function pushUnavailable(
  meta: MetaMaybePush | undefined,
  build: PushBuild,
): PushUnavailable | null {
  if (!meta) return "loading";
  if (!hasServerPush(meta)) return "server";
  if (build.expoGo) return "expoGo";
  // FCM delivers Expo pushes on Android; iOS needs only the project id (APNs keys live at Expo).
  if (!build.projectId || (Platform.OS === "android" && !build.fcm)) return "build";
  return null;
}
