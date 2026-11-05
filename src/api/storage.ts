import * as SecureStore from "expo-secure-store";

// Everything silo-mobile persists lives in the system's secure store (Android Keystore / iOS
// Keychain): the bearer token is equivalent to the mailbox password for up to a year (ADR 0007).
const KEY_TOKEN = "silo.token";
const KEY_SERVER_URL = "silo.serverUrl";
const KEY_INSTALLATION_ID = "silo.installationId";

export type StoredCredentials = { serverUrl: string | null; token: string | null };

export async function readCredentials(): Promise<StoredCredentials> {
  const [serverUrl, token] = await Promise.all([
    SecureStore.getItemAsync(KEY_SERVER_URL),
    SecureStore.getItemAsync(KEY_TOKEN),
  ]);
  return { serverUrl, token };
}

export async function saveCredentials(serverUrl: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_SERVER_URL, serverUrl);
  await SecureStore.setItemAsync(KEY_TOKEN, token);
}

/** Forgets the token; the server address stays to prefill the sign-in screen. */
export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_TOKEN);
}

function randomId(): string {
  // Not a secret: it only tells the requests of this installation apart (X-Silo-Client).
  let id = "";
  while (id.length < 8) id += Math.random().toString(36).slice(2);
  return id.slice(0, 8);
}

let installationId: Promise<string> | undefined;

/** Random 8-character id of this installation, created once and kept in the secure store. */
export function getInstallationId(): Promise<string> {
  installationId ??= (async () => {
    const existing = await SecureStore.getItemAsync(KEY_INSTALLATION_ID);
    if (existing) return existing;
    const created = randomId();
    await SecureStore.setItemAsync(KEY_INSTALLATION_ID, created);
    return created;
  })();
  return installationId;
}

/** Test helper: forgets the cached installation id. */
export function resetInstallationIdForTests(): void {
  installationId = undefined;
}
