import { queryClient } from "../api/cache";
import { useAuth } from "../state/auth";

/** The in-memory fake of expo-secure-store (jest.setup.ts). */
export function secureStore(): Map<string, string> {
  return (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store;
}

/** Back to the start-up state: nothing signed in, empty query cache. */
export function resetAuth(): void {
  useAuth.setState({ status: "signedOut", serverUrl: null, token: null });
  queryClient.clear();
}
