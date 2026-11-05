import { http, HttpResponse } from "msw";
import * as SecureStore from "expo-secure-store";
import { restoreAuth, useAuth } from "../state/auth";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { resetAuth, secureStore } from "../test/utils";
import { sessionBody } from "../test/fixtures";
import { defaultDeviceName, login, logout } from "./auth";
import { queryClient } from "./cache";
import { keys } from "./keys";

setupMsw();

beforeEach(() => resetAuth());

describe("login", () => {
  it("opens a bearer session and keeps the token in the secure store", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/session`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...sessionBody, token: "tok_new" });
      }),
    );

    const session = await login({
      serverUrl: SERVER_URL,
      email: "ala@example.com",
      password: "secret",
      deviceName: "Pixel 8",
    });

    expect(body).toEqual({
      email: "ala@example.com",
      password: "secret",
      client: { kind: "bearer", name: "Pixel 8" },
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("silo.token", "tok_new");
    expect(secureStore().get("silo.serverUrl")).toBe(SERVER_URL);
    expect(useAuth.getState()).toMatchObject({
      status: "signedIn",
      serverUrl: SERVER_URL,
      token: "tok_new",
    });
    expect(session).not.toHaveProperty("token");
    expect(queryClient.getQueryData(keys.session)).toEqual(sessionBody);
  });

  it("stays signed out when the credentials are wrong", async () => {
    server.use(
      http.post(`${API}/session`, () =>
        HttpResponse.json({ status: 401, code: "invalid_credentials" }, { status: 401 }),
      ),
    );

    await expect(
      login({ serverUrl: SERVER_URL, email: "a@b.c", password: "x", deviceName: "Pixel 8" }),
    ).rejects.toMatchObject({ status: 401, code: "invalid_credentials" });

    expect(useAuth.getState().status).toBe("signedOut");
    expect(secureStore().has("silo.token")).toBe(false);
  });
});

describe("restoreAuth", () => {
  it("signs in from the stored token at start-up", async () => {
    secureStore().set("silo.serverUrl", SERVER_URL);
    secureStore().set("silo.token", "tok_1");
    useAuth.setState({ status: "loading" });

    await restoreAuth();

    expect(useAuth.getState()).toMatchObject({ status: "signedIn", token: "tok_1" });
  });

  it("is signed out without a token but keeps the server address", async () => {
    secureStore().set("silo.serverUrl", SERVER_URL);
    useAuth.setState({ status: "loading" });

    await restoreAuth();

    expect(useAuth.getState()).toMatchObject({ status: "signedOut", serverUrl: SERVER_URL });
  });
});

describe("logout", () => {
  beforeEach(() => {
    secureStore().set("silo.serverUrl", SERVER_URL);
    secureStore().set("silo.token", "tok_1");
    useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
  });

  it("ends the session on the server and forgets the token", async () => {
    let auth: string | null = null;
    server.use(
      http.delete(`${API}/session`, ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await logout();

    expect(auth).toBe("Bearer tok_1");
    expect(useAuth.getState().status).toBe("signedOut");
    expect(secureStore().has("silo.token")).toBe(false);
    expect(secureStore().get("silo.serverUrl")).toBe(SERVER_URL);
  });

  it("signs out locally when the session had already ended (401)", async () => {
    server.use(
      http.delete(`${API}/session`, () =>
        HttpResponse.json({ status: 401, code: "unauthorized" }, { status: 401 }),
      ),
    );

    await logout();

    expect(useAuth.getState().status).toBe("signedOut");
    expect(secureStore().has("silo.token")).toBe(false);
  });
});

describe("defaultDeviceName", () => {
  it("uses the device name from expo-device", () => {
    expect(defaultDeviceName()).toBe("Pixel Test");
  });
});
