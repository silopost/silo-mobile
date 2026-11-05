import createClient, { type Client, type Middleware } from "openapi-fetch";
import { version } from "../../package.json";
import { useAuth } from "../state/auth";
import { forgetSession } from "./cache";
import type { paths } from "./schema";
import { getInstallationId } from "./storage";

export type Api = Client<paths>;

/**
 * Value of X-Silo-Client: the server echoes it as `origin` in the events a request causes, so the
 * app can recognise its own changes (plan 5.4).
 */
export async function clientId(): Promise<string> {
  return `silo-mobile/${version}#${await getInstallationId()}`;
}

/** URL of the REST API of an instance, from the address the user entered. */
export function apiBaseUrl(serverUrl: string): string {
  return `${serverUrl.replace(/\/+$/, "")}/api/v1`;
}

const bearer = (token: string) => `Bearer ${token}`;

const headers: Middleware = {
  async onRequest({ request }) {
    request.headers.set("X-Silo-Client", await clientId());
    const token = useAuth.getState().token;
    if (token) request.headers.set("Authorization", bearer(token));
    return request;
  },
  onResponse({ request, response, schemaPath }) {
    // 401 means the session ended (expired, revoked from another device): sign out locally and
    // let the router show the sign-in screen. A failed sign-in (POST /session) is not that.
    if (response.status !== 401) return;
    if (request.method === "POST" && schemaPath === "/session") return;
    const token = useAuth.getState().token;
    // Ignore late answers to requests made with an older token than the current one.
    if (token && request.headers.get("Authorization") === bearer(token)) void forgetSession();
  },
};

/** A client of one Silo instance; used directly for /meta and sign-in before one is stored. */
export function createApiClient(serverUrl: string): Api {
  const client = createClient<paths>({
    baseUrl: apiBaseUrl(serverUrl),
    // Resolve fetch per call so test servers (msw) installed later are honoured.
    fetch: (request) => globalThis.fetch(request),
  });
  client.use(headers);
  return client;
}

let current: { serverUrl: string; client: Api } | undefined;

/** The client of the instance the user is signed in to. */
export function api(): Api {
  const { serverUrl } = useAuth.getState();
  if (!serverUrl) throw new Error("No Silo server configured");
  if (current?.serverUrl !== serverUrl) current = { serverUrl, client: createApiClient(serverUrl) };
  return current.client;
}
