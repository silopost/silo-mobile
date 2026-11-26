import { act, screen, waitFor } from "expo-router/testing-library";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { logout } from "../../api/auth";
import { defaultPush, usePush } from "../../state/push";
import {
  account,
  labels,
  message,
  sessionBody,
  thread,
  threadDetail,
  threadPage,
} from "../../test/fixtures";
import { device, notifications, servePushMeta, setPushBuild, tap } from "../../test/push";
import { renderApp, signIn } from "../../test/router";
import { resetDeviceTokenForTests } from "./register";
import { API, server, setupMsw } from "../../test/server";
import { resetAuth, secureStore } from "../../test/utils";

setupMsw();

const second = { ...account, id: "acc_2", email: "praca@example.com", position: 1 };

let registered: { pushToken: string; accountIds?: string[] | null }[];
let deleted: string[];

/** Time for token events and any registrations they would cause. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 200)));

beforeEach(() => {
  resetDeviceTokenForTests();
  resetAuth();
  signIn();
  usePush.setState({ ...defaultPush });
  setPushBuild({});
  servePushMeta(["expo"]);
  registered = [];
  deleted = [];
  server.use(
    http.get(`${API}/session`, () =>
      HttpResponse.json({ ...sessionBody, accounts: [account, second] }),
    ),
    http.delete(`${API}/session`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${API}/devices`, async ({ request }) => {
      const body = (await request.json()) as (typeof registered)[number];
      registered.push(body);
      return HttpResponse.json(device({ pushToken: body.pushToken, accountIds: body.accountIds }));
    }),
    http.get(`${API}/devices/current`, () => HttpResponse.json(device())),
    http.delete(`${API}/devices/:id`, ({ params }) => {
      deleted.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json({}, { status: 404 })),
    http.get(`${API}/threads`, () => HttpResponse.json(threadPage([thread({})]))),
    http.get(`${API}/threads/t_1`, () => HttpResponse.json(threadDetail([message({ id: "m_1" })]))),
    http.get(`${API}/messages/:id/html`, () =>
      HttpResponse.text("<p>x</p>", { headers: { "Content-Type": "text/html" } }),
    ),
  );
});

afterEach(() => setPushBuild(null));

describe("registration while signed in", () => {
  it("registers again at start-up when push is on here, without asking again", async () => {
    usePush.setState({ enabled: true, accountIds: ["acc_2"], deviceId: "dev_1" });
    await renderApp("/settings");

    await waitFor(() => expect(registered).toHaveLength(1));
    expect(registered[0]).toEqual({
      provider: "expo",
      pushToken: "ExponentPushToken[test-1]",
      accountIds: ["acc_2"],
    });
    expect(notifications().__calls.slice(0, 2)).toEqual(["channel:mail", "getPermissions"]);
    expect(notifications().requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("registers once at start-up although every token fetch emits the token", async () => {
    usePush.setState({ enabled: true, accountIds: null, deviceId: "dev_1" });
    await renderApp("/settings");
    await waitFor(() => expect(registered).toHaveLength(1));

    await settle();

    expect(registered).toHaveLength(1);
    expect(notifications().getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
  });

  it("registers nothing when push is off here", async () => {
    await renderApp("/settings");
    await screen.findByTestId("settings-general");

    expect(registered).toEqual([]);
    expect(notifications().getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("registers nothing on a server without push", async () => {
    servePushMeta([]);
    usePush.setState({ enabled: true, accountIds: null, deviceId: "dev_1" });
    await renderApp("/settings");
    await screen.findByTestId("settings-general");

    expect(registered).toEqual([]);
  });

  it("registers the new token when the push token rotates", async () => {
    usePush.setState({ enabled: true, accountIds: null, deviceId: "dev_1" });
    await renderApp("/settings");
    await waitFor(() => expect(registered).toHaveLength(1));

    await settle();

    notifications().__state.token = "ExponentPushToken[test-2]";
    notifications().__state.deviceToken = "fcm-2";
    await act(async () => notifications().__emitToken({ type: "android", data: "fcm-2" }));

    await waitFor(() => expect(registered).toHaveLength(2));
    expect(registered[1]?.pushToken).toBe("ExponentPushToken[test-2]");
    // The event of that registration (fcm-2 again) registers nothing more.
    await settle();
    expect(registered).toHaveLength(2);
  });

  it("switches push off when the permission was taken away in the system settings", async () => {
    notifications().__state.permission = "denied";
    usePush.setState({ enabled: true, accountIds: null, deviceId: "dev_1" });
    await renderApp("/settings");

    await waitFor(() => expect(usePush.getState().enabled).toBe(false));
    expect(deleted).toEqual(["dev_1"]);
    expect(registered).toEqual([]);
    expect(notifications().requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("forgets the choice on sign-out, so the next sign-in registers nothing", async () => {
    usePush.setState({ enabled: true, accountIds: null, deviceId: "dev_1" });
    await renderApp("/settings");
    await waitFor(() => expect(registered).toHaveLength(1));

    await act(() => logout());
    expect(usePush.getState()).toEqual(defaultPush);
    // The server deletes the device with the session; the app sends no DELETE /devices.
    expect(deleted).toEqual([]);

    await act(async () => signIn());
    await act(async () => router.replace("/settings"));
    await screen.findByTestId("settings-general");
    notifications().__emitToken({ type: "android", data: "fcm-2" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(registered).toHaveLength(1);
  });
});

describe("tapping a notification", () => {
  const mail = (over: Record<string, unknown>) => ({
    v: 1,
    type: "mail",
    accountId: "acc_1",
    threadId: "t_1",
    count: 1,
    ...over,
  });

  it("opens the thread of a single new message", async () => {
    const app = await renderApp("/settings");
    await screen.findByTestId("settings-general");

    await act(async () => notifications().__emitResponse(tap(mail({}))));

    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox/t_1"));
  });

  it("opens the Inbox of the account for several messages", async () => {
    const app = await renderApp("/settings");
    await screen.findByTestId("settings-general");

    await act(async () =>
      notifications().__emitResponse(tap(mail({ accountId: "acc_2", count: 3 }))),
    );

    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
  });

  it("opens the thread of the notification that started the app", async () => {
    notifications().__state.lastResponse = tap(mail({}));
    const app = await renderApp("/");

    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox/t_1"));
    expect(notifications().__state.lastResponse).toBeNull();
  });

  it("ignores an unknown type or version and an account the user no longer has", async () => {
    const app = await renderApp("/settings");
    await screen.findByTestId("settings-general");

    await act(async () => {
      notifications().__emitResponse(tap({ v: 1, type: "calendar", accountId: "acc_1" }));
      notifications().__emitResponse(tap(mail({ v: 2 })));
      notifications().__emitResponse(tap(mail({ accountId: "acc_9" })));
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(app.getPathname()).toBe("/settings");
  });

  it("opens nothing after sign-out", async () => {
    notifications().__state.lastResponse = tap(mail({}));
    resetAuth();
    secureStore().clear();
    const app = await renderApp("/settings");

    await waitFor(() => expect(app.getPathname()).toBe("/login"));
    expect(notifications().__state.lastResponse).toBeNull();
  });
});
