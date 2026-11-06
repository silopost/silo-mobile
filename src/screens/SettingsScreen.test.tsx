import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { defaultUi, useUi } from "../state/ui";
import { account, sessionBody } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, server, setupMsw } from "../test/server";
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
