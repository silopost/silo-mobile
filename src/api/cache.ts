import { QueryClient } from "@tanstack/react-query";
import { setSignedOut } from "../state/auth";

/** The one query cache of the app (server state). */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

/** Ends the session on this device: forgets the token and everything cached for the user. */
export async function forgetSession(): Promise<void> {
  await setSignedOut();
  queryClient.clear();
}
