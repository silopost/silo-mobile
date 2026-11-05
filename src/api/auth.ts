import * as Device from "expo-device";
import { setSignedIn } from "../state/auth";
import { forgetSession, queryClient } from "./cache";
import { api, createApiClient } from "./client";
import { call, isApiError } from "./errors";
import { keys } from "./keys";
import type { components } from "./schema";

export type Session = components["schemas"]["SessionBody"];

/** Longest device name the server accepts (LoginClient.name). */
const MAX_DEVICE_NAME = 100;

/** Name of this device in the session list: the user-set name, else the model. */
export function defaultDeviceName(): string {
  const name = Device.deviceName?.trim() || Device.modelName?.trim() || "Silo Mobile";
  return name.slice(0, MAX_DEVICE_NAME);
}

export type LoginInput = {
  /** Normalised address of the instance (see normalizeServerUrl). */
  serverUrl: string;
  email: string;
  password: string;
  deviceName: string;
};

/**
 * POST /session as a native client (ADR 0007): the answer carries a bearer token, shown once,
 * which is kept in the secure store together with the server address.
 */
export async function login({ serverUrl, email, password, deviceName }: LoginInput) {
  const session = await call(
    createApiClient(serverUrl).POST("/session", {
      body: { email, password, client: { kind: "bearer", name: deviceName } },
    }),
  );
  if (!session.token) throw new Error("The server did not return a bearer token");
  queryClient.clear();
  await setSignedIn(serverUrl, session.token);
  // The session body doubles as GET /session; the token stays out of the cache.
  const { token: _token, ...cached } = session;
  queryClient.setQueryData(keys.session, cached);
  return cached;
}

/**
 * DELETE /session, then forget the token on this device. A 401 means the session had already
 * ended; other failures (offline) still sign out locally – the session can then be revoked from
 * another device's session list.
 */
export async function logout(): Promise<void> {
  try {
    await call(api().DELETE("/session"));
  } catch (err) {
    if (isApiError(err) && err.status !== 401) console.warn("Sign-out failed on the server", err);
  } finally {
    await forgetSession();
  }
}
