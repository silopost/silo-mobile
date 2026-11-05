import { create } from "zustand";
import { deleteToken, readCredentials, saveCredentials } from "../api/storage";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthState = {
  status: AuthStatus;
  /** Origin of the Silo instance, e.g. https://mail.example.com (without /api/v1). */
  serverUrl: string | null;
  /**
   * Bearer token cached in memory. Only the API layer (src/api) reads it; screens need `status`
   * and `serverUrl` alone.
   */
  token: string | null;
};

export const useAuth = create<AuthState>(() => ({
  status: "loading",
  serverUrl: null,
  token: null,
}));

/** Reads the stored session at start-up: signedIn when a token is kept, signedOut otherwise. */
export async function restoreAuth(): Promise<void> {
  try {
    const { serverUrl, token } = await readCredentials();
    useAuth.setState(
      serverUrl && token
        ? { status: "signedIn", serverUrl, token }
        : { status: "signedOut", serverUrl, token: null },
    );
  } catch {
    useAuth.setState({ status: "signedOut", token: null });
  }
}

export async function setSignedIn(serverUrl: string, token: string): Promise<void> {
  await saveCredentials(serverUrl, token);
  useAuth.setState({ status: "signedIn", serverUrl, token });
}

/** Drops the token locally (memory and secure store); the server address is kept. */
export async function setSignedOut(): Promise<void> {
  useAuth.setState({ status: "signedOut", token: null });
  await deleteToken();
}
