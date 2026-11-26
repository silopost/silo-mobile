import { act, fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { defaultPush, usePush } from "../../state/push";
import { useToasts } from "../../state/toasts";
import { account, sessionBody } from "../../test/fixtures";
import { device, notifications, PROJECT_ID, servePushMeta, setPushBuild } from "../../test/push";
import { renderApp, signIn } from "../../test/router";
import { API, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";
import { resetDeviceTokenForTests } from "./register";

setupMsw();

const second = { ...account, id: "acc_2", email: "praca@example.com", position: 1 };

let registered: unknown[];
let deleted: string[];
let current: ReturnType<typeof device> | null;

beforeEach(() => {
  resetDeviceTokenForTests();
  resetAuth();
  signIn();
  usePush.setState({ ...defaultPush });
  useToasts.setState({ current: null });
  setPushBuild({});
  servePushMeta(["expo"]);
  registered = [];
  deleted = [];
  current = null;
  server.use(
    http.get(`${API}/session`, () =>
      HttpResponse.json({ ...sessionBody, accounts: [account, second] }),
    ),
    http.post(`${API}/devices`, async ({ request }) => {
      const body = (await request.json()) as { pushToken: string; accountIds?: string[] | null };
      registered.push(body);
      // Registering again keeps the delivery state of the device.
      current = device({
        lastError: current?.lastError ?? null,
        pushToken: body.pushToken,
        accountIds: body.accountIds ?? null,
      });
      return HttpResponse.json(current);
    }),
    http.get(`${API}/devices/current`, () =>
      current
        ? HttpResponse.json(current)
        : HttpResponse.json({ code: "not_found", status: 404 }, { status: 404 }),
    ),
    http.delete(`${API}/devices/:id`, ({ params }) => {
      deleted.push(String(params.id));
      current = null;
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

afterEach(() => setPushBuild(null));

const pushSwitch = () => screen.findByRole("switch", { name: /Powiadomienia z Odebranych/ });

describe("switching push on", () => {
  it("creates the mail channel, asks for permission, then registers the Expo token", async () => {
    notifications().__state.permission = "undetermined";
    await renderApp("/settings/general");

    await fireEvent.press(await pushSwitch());

    await waitFor(() => expect(usePush.getState().enabled).toBe(true));
    expect(notifications().__calls).toEqual([
      "channel:mail",
      "getPermissions",
      "requestPermissions",
      `token:${PROJECT_ID}`,
    ]);
    expect(notifications().setNotificationChannelAsync).toHaveBeenCalledWith(
      "mail",
      expect.objectContaining({ importance: 4, name: "Nowa poczta" }),
    );
    expect(registered).toEqual([
      { provider: "expo", pushToken: "ExponentPushToken[test-1]", accountIds: null },
    ]);
    expect(usePush.getState().deviceId).toBe("dev_1");
    expect(await pushSwitch()).toBeChecked();
    // The token event of this registration does not register again.
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    expect(registered).toHaveLength(1);
  });

  it("stays off with a message when the system permission is refused", async () => {
    notifications().__state.permission = "undetermined";
    notifications().__state.answer = "denied";
    await renderApp("/settings/general");

    await fireEvent.press(await pushSwitch());

    expect(await screen.findByText(/Brak zgody na powiadomienia/)).toBeOnTheScreen();
    expect(usePush.getState().enabled).toBe(false);
    expect(await pushSwitch()).not.toBeChecked();
    expect(registered).toEqual([]);
    expect(notifications().__calls).not.toContain(`token:${PROJECT_ID}`);
  });

  it("stays off when the server refuses (push_disabled)", async () => {
    server.use(
      http.post(`${API}/devices`, () =>
        HttpResponse.json({ code: "push_disabled", status: 403 }, { status: 403 }),
      ),
    );
    await renderApp("/settings/general");

    await fireEvent.press(await pushSwitch());

    expect(await screen.findByText("Serwer ma wyłączone powiadomienia push.")).toBeOnTheScreen();
    expect(usePush.getState().enabled).toBe(false);
  });
});

describe("with push on", () => {
  beforeEach(() => {
    usePush.setState({ enabled: true, accountIds: null, deviceId: "dev_1" });
    current = device();
  });

  it("switching off deletes the device", async () => {
    await renderApp("/settings/general");
    await screen.findByTestId("setting-push-accounts");

    await fireEvent.press(await pushSwitch());

    await waitFor(() => expect(usePush.getState().enabled).toBe(false));
    expect(deleted).toEqual(["dev_1"]);
    expect(usePush.getState().deviceId).toBeNull();
  });

  it("limits push to the chosen accounts", async () => {
    await renderApp("/settings/general");
    const item = await screen.findByTestId("setting-push-accounts");
    expect(within(item).getByText("Wszystkie konta")).toBeOnTheScreen();

    await fireEvent.press(item);
    await fireEvent.press(await screen.findByTestId("push-account-acc_1"));
    await fireEvent.press(screen.getByTestId("push-accounts-save"));

    await waitFor(() => expect(usePush.getState().accountIds).toEqual(["acc_2"]));
    expect(registered.at(-1)).toEqual({
      provider: "expo",
      pushToken: "ExponentPushToken[test-1]",
      accountIds: ["acc_2"],
    });
    expect(await screen.findByText("1 z 2")).toBeOnTheScreen();
  });

  it("shows the last delivery error of the device", async () => {
    current = device({ lastError: "MessageRateExceeded" });
    await renderApp("/settings/general");

    expect(await screen.findByTestId("push-last-error")).toHaveTextContent(
      "Ostatni błąd doręczenia: MessageRateExceeded",
    );
  });

  it("registers again when the server no longer has the device (404)", async () => {
    current = null;
    await renderApp("/settings/general");

    await waitFor(() => expect(registered.length).toBeGreaterThanOrEqual(1));
    expect(registered.at(-1)).toEqual({
      provider: "expo",
      pushToken: "ExponentPushToken[test-1]",
      accountIds: null,
    });
    // It does not prompt again: the permission is only checked.
    expect(notifications().requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("availability", () => {
  it("is inactive on a server without push (no push field)", async () => {
    servePushMeta(undefined);
    await renderApp("/settings/general");

    const item = await screen.findByTestId("setting-push");
    await waitFor(() => expect(item).toHaveTextContent(/serwer nie obsługuje powiadomień push/));
    expect(item).toBeDisabled();
  });

  it("is inactive on a server with push switched off ([])", async () => {
    servePushMeta([]);
    await renderApp("/settings/general");

    await waitFor(() =>
      expect(screen.getByTestId("setting-push")).toHaveTextContent(/lub ma je wyłączone/),
    );
    expect(screen.getByTestId("setting-push")).toBeDisabled();
  });

  it("is inactive in a build without a project id", async () => {
    setPushBuild({ projectId: null });
    await renderApp("/settings/general");

    await waitFor(() =>
      expect(screen.getByTestId("setting-push")).toHaveTextContent(
        /zbudowana bez konfiguracji powiadomień push/,
      ),
    );
    expect(screen.getByTestId("setting-push")).toBeDisabled();
  });

  it("is inactive in an Android build without Firebase", async () => {
    setPushBuild({ fcm: false });
    await renderApp("/settings/general");

    await waitFor(() =>
      expect(screen.getByTestId("setting-push")).toHaveTextContent(/bez konfiguracji/),
    );
  });
});
