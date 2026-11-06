import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { defaultUi, useUi } from "../state/ui";
import { account, sessionBody } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, serveMeta, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

setupMsw();

const second = {
  ...account,
  id: "acc_2",
  email: "praca@example.com",
  displayName: "",
  position: 1,
};

/** The persisted preferences as AsyncStorage holds them. */
async function stored(): Promise<Record<string, unknown>> {
  const storage = jest.requireMock("@react-native-async-storage/async-storage") as {
    getItem: (key: string) => Promise<string | null>;
  };
  return (
    JSON.parse((await storage.getItem("silo.ui")) ?? "{}") as { state: Record<string, unknown> }
  ).state;
}

beforeEach(() => {
  resetAuth();
  signIn();
  useUi.setState({ ...defaultUi });
  server.use(
    http.get(`${API}/session`, () =>
      // Out of order: the list follows Account.position.
      HttpResponse.json({ ...sessionBody, accounts: [second, account] }),
    ),
  );
});

describe("settings list", () => {
  it("lists general settings, the accounts by position, add account and about", async () => {
    await renderApp("/settings");

    expect(await screen.findByTestId("settings-general")).toBeOnTheScreen();
    const first = await screen.findByTestId("settings-account-acc_1");
    expect(within(first).getByText("ala@example.com")).toBeOnTheScreen();
    expect(screen.getByTestId("settings-account-acc_2")).toBeOnTheScreen();
    const ids = screen
      .getAllByTestId(/^settings-account-acc_[0-9]$/)
      .map((e) => (e.props as { testID: string }).testID);
    expect(ids).toEqual(["settings-account-acc_1", "settings-account-acc_2"]);
    expect(screen.getByRole("link", { name: "Dodaj konto" })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "O aplikacji" })).toBeOnTheScreen();
  });

  it("opens general settings", async () => {
    const app = await renderApp("/settings");

    await fireEvent.press(await screen.findByTestId("settings-general"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/general"));
  });
});

describe("general settings", () => {
  it("changes the theme in a radio dialog and persists it", async () => {
    await renderApp("/settings/general");

    const item = await screen.findByTestId("setting-theme");
    expect(within(item).getByText("Systemowy")).toBeOnTheScreen();
    await fireEvent.press(item);
    await fireEvent.press(await screen.findByTestId("choice-dark"));

    expect(useUi.getState().theme).toBe("dark");
    await waitFor(() => expect(screen.queryByTestId("choice-dialog")).toBeNull());
    expect(within(screen.getByTestId("setting-theme")).getByText("Ciemny")).toBeOnTheScreen();
    await waitFor(async () => expect((await stored()).theme).toBe("dark"));
  });

  it("changes the swipe actions per side and the density", async () => {
    await renderApp("/settings/general");

    const right = await screen.findByTestId("setting-swipe-right");
    expect(within(right).getByText("Usuń")).toBeOnTheScreen();
    expect(within(right).getByTestId("swipe-preview-trash")).toBeOnTheScreen();
    await fireEvent.press(right);
    await fireEvent.press(await screen.findByTestId("choice-none"));
    expect(useUi.getState()).toMatchObject({
      swipeRightAction: "none",
      swipeLeftAction: "archive",
    });

    await fireEvent.press(screen.getByTestId("setting-swipe-left"));
    await fireEvent.press(await screen.findByTestId("choice-trash"));
    expect(useUi.getState()).toMatchObject({ swipeRightAction: "none", swipeLeftAction: "trash" });

    await fireEvent.press(screen.getByTestId("setting-density"));
    await fireEvent.press(await screen.findByTestId("choice-compact"));
    expect(useUi.getState().density).toBe("compact");
    await waitFor(async () =>
      expect(await stored()).toMatchObject({
        swipeLeftAction: "trash",
        swipeRightAction: "none",
        density: "compact",
      }),
    );
  });

  it("toggles the confirmations, marking read and remote images", async () => {
    await renderApp("/settings/general");

    const trash = await screen.findByRole("switch", { name: /Potwierdzaj przed usunięciem/ });
    expect(trash).not.toBeChecked();
    await fireEvent.press(trash);
    expect(useUi.getState().confirmTrash).toBe(true);
    await fireEvent.press(screen.getByRole("switch", { name: /Oznaczaj jako przeczytane/ }));
    expect(useUi.getState().markReadOnOpen).toBe(false);
    await fireEvent.press(screen.getByTestId("setting-images"));
    await fireEvent.press(await screen.findByTestId("choice-always"));
    expect(useUi.getState().showRemoteImages).toBe("always");

    expect(screen.getByTestId("setting-push")).toBeDisabled();
  });
});

describe("synced settings (server 0.4.0)", () => {
  let patches: Record<string, unknown>[];
  let current: typeof sessionBody.settings;

  beforeEach(() => {
    serveMeta("0.4.0");
    patches = [];
    current = { ...sessionBody.settings };
    server.use(
      http.get(`${API}/settings`, () => HttpResponse.json(current)),
      http.patch(`${API}/settings`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patches.push(body);
        if (body.timezone === "Asia/Tokyo")
          return HttpResponse.json(
            { status: 422, code: "invalid_timezone", title: "Unprocessable Entity" },
            { status: 422 },
          );
        current = { ...current, ...body, updatedAt: "2026-11-06T10:00:00Z" } as typeof current;
        return HttpResponse.json(current);
      }),
    );
  });

  it("changes the density on the server and keeps a copy on the device", async () => {
    await renderApp("/settings/general");

    await screen.findByTestId("setting-undo-send");
    const item = screen.getByTestId("setting-density");
    expect(within(item).getByText("Domyślna")).toBeOnTheScreen();
    expect(screen.getByText("Konto Silo (synchronizowane)")).toBeOnTheScreen();
    await fireEvent.press(item);
    await fireEvent.press(await screen.findByTestId("choice-comfortable"));

    await waitFor(() => expect(patches).toEqual([{ density: "comfortable" }]));
    await waitFor(() =>
      expect(within(screen.getByTestId("setting-density")).getByText("Wygodna")).toBeOnTheScreen(),
    );
    expect(useUi.getState().density).toBe("comfortable");
  });

  it("sets the undo-send time and the signature, one field per PATCH", async () => {
    await renderApp("/settings/general");

    await fireEvent.press(await screen.findByTestId("setting-undo-send"));
    await fireEvent.press(await screen.findByTestId("choice-20"));
    await waitFor(() => expect(patches).toEqual([{ undoSendSeconds: 20 }]));
    expect(within(screen.getByTestId("setting-undo-send")).getByText("20 s")).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("setting-signature"));
    await fireEvent.changeText(
      within(await screen.findByTestId("signature-dialog")).getByLabelText("Podpis"),
      "Pozdrawiam,\nAla",
    );
    await fireEvent.press(screen.getByText("Zapisz"));
    await waitFor(() => expect(patches[1]).toEqual({ signature: "Pozdrawiam,<br>Ala" }));
  });

  it("puts the old time zone back when the server refuses the new one", async () => {
    await renderApp("/settings/general");

    const item = await screen.findByTestId("setting-timezone");
    expect(within(item).getByText(/Europe.Warsaw/)).toBeOnTheScreen();
    await fireEvent.press(item);
    const dialog = await screen.findByTestId("timezone-dialog");
    await fireEvent.changeText(within(dialog).getByLabelText("Szukaj strefy"), "tokyo");
    await fireEvent.press(await screen.findByTestId("timezone-Asia/Tokyo"));

    await waitFor(() => expect(patches).toEqual([{ timezone: "Asia/Tokyo" }]));
    expect(await screen.findByText("Nieznana strefa czasowa.")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("setting-timezone")).getByText(/Europe.Warsaw/),
    ).toBeOnTheScreen();
  });

  it("hides the synced section on a 0.3.0 server", async () => {
    serveMeta("0.3.0");
    await renderApp("/settings/general");
    expect(await screen.findByTestId("setting-density")).toBeOnTheScreen();
    expect(screen.queryByTestId("setting-undo-send")).toBeNull();
    expect(screen.queryByText("Konto Silo (synchronizowane)")).toBeNull();
  });
});
