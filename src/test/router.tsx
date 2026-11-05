import { renderRouter } from "expo-router/testing-library";
import { useAuth } from "../state/auth";
import { SERVER_URL } from "./server";
import { secureStore } from "./utils";

// The first render of the whole app (every route module) is slow on a cold transform cache.
jest.setTimeout(30_000);

/** Signs in (secure store and auth state) as the root layout would find it at start-up. */
export function signIn(): void {
  secureStore().set("silo.serverUrl", SERVER_URL);
  secureStore().set("silo.token", "tok_1");
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
}

/**
 * Renders the real app/ routes (layouts, guard, drawer) in memory at a URL
 * (jest runs from the project root).
 */
export function renderApp(initialUrl: string) {
  return renderRouter("./app", { initialUrl });
}
