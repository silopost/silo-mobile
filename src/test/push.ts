import Constants from "expo-constants";
import { http, HttpResponse } from "msw";
import { API, defaultMeta, server } from "./server";

/** The fake expo-notifications of jest.setup.ts. */
export type NotificationsMock = {
  __calls: string[];
  __state: {
    /** What getPermissionsAsync answers now. */
    permission: "granted" | "denied" | "undetermined";
    /** What the system prompt (requestPermissionsAsync) answers. */
    answer: "granted" | "denied";
    token: string;
    /** The device (FCM) token a token fetch emits to the token listeners. */
    deviceToken: string;
    lastResponse: unknown;
  };
  __emitToken: (token: unknown) => void;
  __emitResponse: (response: unknown) => void;
  setNotificationChannelAsync: jest.Mock;
  setNotificationHandler: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};

export function notifications(): NotificationsMock {
  return jest.requireMock("expo-notifications");
}

export const PROJECT_ID = "00000000-0000-4000-8000-000000000000";

/**
 * The push configuration of the build (app.config.ts `extra`): with a project id and Firebase
 * by default; `null` restores the unconfigured build.
 */
export function setPushBuild(
  build: { projectId?: string | null; fcm?: boolean } | null = {},
): void {
  const extra =
    build === null
      ? {}
      : {
          ...(build.projectId !== null && { eas: { projectId: build.projectId ?? PROJECT_ID } }),
          push: { fcm: build.fcm ?? true },
        };
  // expoConfig is a getter of one object (jest-expo): its extra is replaced in place.
  Object.assign(Constants.expoConfig ?? {}, { extra });
}

/** GET /meta of a server with push: `providers` as given, or no `push` field (undefined). */
export function servePushMeta(providers: string[] | undefined, serverVersion = "0.4.0") {
  server.use(
    http.get(`${API}/meta`, () =>
      HttpResponse.json({
        ...defaultMeta,
        serverVersion,
        ...(providers && { push: { providers } }),
      }),
    ),
  );
}

/** A device as POST /devices and GET /devices/current answer it. */
export function device(over: Record<string, unknown> = {}) {
  return {
    id: "dev_1",
    provider: "expo",
    pushToken: "ExponentPushToken[test-1]",
    accountIds: null,
    createdAt: "2026-11-25T10:00:00Z",
    lastUsedAt: "2026-11-25T10:00:00Z",
    lastError: null,
    ...over,
  };
}

/** A tap on a notification carrying `data`. */
export function tap(
  data: unknown,
  actionIdentifier = "expo.modules.notifications.actions.DEFAULT",
) {
  return {
    actionIdentifier,
    notification: { request: { identifier: "n1", content: { title: "Nowa wiadomość", data } } },
  };
}
