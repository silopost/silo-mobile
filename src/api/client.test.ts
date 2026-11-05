import { http, HttpResponse } from "msw";
import { useAuth } from "../state/auth";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { resetAuth, secureStore } from "../test/utils";
import { api, apiBaseUrl, createApiClient } from "./client";
import { call } from "./errors";
import { resetInstallationIdForTests } from "./storage";

setupMsw();

beforeEach(() => {
  resetAuth();
  resetInstallationIdForTests();
});

const session = {
  user: { id: "u_1", email: "ala@example.com", displayName: "Ala", isAdmin: false },
  csrfToken: "",
  settings: {
    density: "default",
    undoSendSeconds: 5,
    signature: "",
    timezone: "Europe/Warsaw",
    keyboardShortcutsEnabled: true,
    conversationView: true,
    activeAccountId: null,
  },
  accounts: [],
} as const;

describe("apiBaseUrl", () => {
  it("appends /api/v1 without doubling the slash", () => {
    expect(apiBaseUrl("https://mail.example.com/")).toBe("https://mail.example.com/api/v1");
    expect(apiBaseUrl("https://mail.example.com")).toBe("https://mail.example.com/api/v1");
  });
});

describe("headers middleware", () => {
  it("sends the bearer token and X-Silo-Client with the installation id", async () => {
    useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
    let seen: Headers | undefined;
    server.use(
      http.get(`${API}/session`, ({ request }) => {
        seen = request.headers;
        return HttpResponse.json(session);
      }),
    );

    await call(api().GET("/session"));

    expect(seen?.get("authorization")).toBe("Bearer tok_1");
    const clientId = seen?.get("x-silo-client") ?? "";
    expect(clientId).toMatch(/^silo-mobile\/0\.1\.0#[a-z0-9]{8}$/);
    // The installation id is created once and kept in the secure store.
    expect(clientId.split("#")[1]).toBe(secureStore().get("silo.installationId"));
  });

  it("sends no Authorization header when signed out", async () => {
    let seen: Headers | undefined;
    server.use(
      http.get(`${API}/meta`, ({ request }) => {
        seen = request.headers;
        return HttpResponse.json({ serverVersion: "0.3.0" });
      }),
    );

    await call(createApiClient(SERVER_URL).GET("/meta"));

    expect(seen?.has("authorization")).toBe(false);
    expect(seen?.get("x-silo-client")).toMatch(/^silo-mobile\//);
  });

  it("keeps the installation id across requests", async () => {
    const ids: string[] = [];
    server.use(
      http.get(`${API}/meta`, ({ request }) => {
        ids.push(request.headers.get("x-silo-client") ?? "");
        return HttpResponse.json({ serverVersion: "0.3.0" });
      }),
    );
    await call(createApiClient(SERVER_URL).GET("/meta"));
    resetInstallationIdForTests(); // as after an app restart: read back from the secure store
    await call(createApiClient(SERVER_URL).GET("/meta"));
    expect(ids[0]).toBe(ids[1]);
  });
});

describe("401 handling", () => {
  it("signs out and forgets the token when the session ended", async () => {
    secureStore().set("silo.token", "tok_1");
    useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
    server.use(
      http.get(`${API}/session`, () =>
        HttpResponse.json({ status: 401, code: "unauthorized" }, { status: 401 }),
      ),
    );

    await expect(call(api().GET("/session"))).rejects.toMatchObject({ status: 401 });

    await waitForStatus("signedOut");
    expect(useAuth.getState().token).toBeNull();
    expect(secureStore().has("silo.token")).toBe(false);
  });

  it("does not sign out on a failed sign-in", async () => {
    useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
    server.use(
      http.post(`${API}/session`, () =>
        HttpResponse.json({ status: 401, code: "invalid_credentials" }, { status: 401 }),
      ),
    );

    await expect(
      call(api().POST("/session", { body: { email: "a@b.c", password: "x" } })),
    ).rejects.toMatchObject({ code: "invalid_credentials" });

    expect(useAuth.getState().status).toBe("signedIn");
  });
});

async function waitForStatus(status: string) {
  for (let i = 0; i < 20 && useAuth.getState().status !== status; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(useAuth.getState().status).toBe(status);
}
