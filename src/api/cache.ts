import { QueryClient } from "@tanstack/react-query";
import { setSignedOut } from "../state/auth";
import { resetPush } from "../state/push";

/** The one query cache of the app (server state). */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

/**
 * Ends the session on this device: forgets the token, everything cached for the user and the
 * notification choice (the server deletes the push device with the session, ON DELETE CASCADE).
 */
export async function forgetSession(): Promise<void> {
  resetPush();
  await setSignedOut();
  queryClient.clear();
}
