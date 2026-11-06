import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { account, sessionBody, syncStatus } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

type SyncStatus = components["schemas"]["SyncStatus"];
type Folder = components["schemas"]["Folder"];

setupMsw();

const second = { ...account, id: "acc_2", email: "praca@example.com", position: 1 };
let accounts: (typeof account)[];
let status: SyncStatus;
let patches: unknown[];

function folder(over: Partial<Folder>): Folder {
  return {
    id: "f_1",
    name: "INBOX",
    role: "inbox",
    messages: 340,
    unread: 12,
    error: null,
    errorCount: 0,
    lastSyncAt: null,
    specialUse: null,
    syncMode: "sync",
    ...over,
  };
}

beforeEach(() => {
  resetAuth();
  signIn();
  accounts = [account, second];
  status = syncStatus({ state: "live", lastSyncAt: "2026-11-05T09:30:00Z" });
  patches = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json({ ...sessionBody, accounts })),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json(status)),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels: [] })),
    http.get(`${API}/threads`, () =>
      HttpResponse.json({ threads: [], nextCursor: null, resultSizeEstimate: 0 }),
    ),
    http.patch(`${API}/accounts/:id`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      patches.push(body);
      if (body.password === "zle") {
        return HttpResponse.json(
          { code: "validation_failed", status: 422, detail: "empty password" },
          { status: 422 },
        );
      }
      const { password: _password, ...rest } = body;
      accounts = accounts.map((a) => (a.id === "acc_1" ? { ...a, ...rest } : a));
      return HttpResponse.json(accounts[0]);
    }),
  );
});

describe("account settings", () => {
  it("opens from the settings list with the account's data", async () => {
    const app = await renderApp("/settings");
    await fireEvent.press(await screen.findByTestId("settings-account-acc_1"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/account/acc_1"));

    expect(await screen.findByText(/^Zsynchronizowane · 5 lis 2026/)).toBeOnTheScreen();
    expect(screen.getAllByText("ala@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("imap.example.com:993 (TLS)")).toBeOnTheScreen();
    expect(screen.getByText("smtp.example.com:465 (TLS)")).toBeOnTheScreen();
    expect(screen.getByText("Oczekujące operacje: 0")).toBeOnTheScreen();
    expect(screen.getByText("Nieudane operacje: 0")).toBeOnTheScreen();
  });

  it("shows the initial sync progress", async () => {
    status = syncStatus({
      state: "initial_sync",
      initialSyncDoneAt: null,
      initialSync: {
        ...syncStatus({}).initialSync,
        phase: "headers",
        messagesDone: 1200,
        messagesTotal: 4800,
      },
    });
    await renderApp("/settings/account/acc_1");

    expect(await screen.findByText("Pierwsza synchronizacja")).toBeOnTheScreen();
    expect(screen.getByLabelText("Postęp pierwszej synchronizacji")).toBeOnTheScreen();
    expect(screen.getByText(/^1\D?200 z 4\D?800 wiadomości$/)).toBeOnTheScreen();
  });

  it("names the unreachable server, counts operations, shows capabilities and folders", async () => {
    status = syncStatus({
      state: "backoff",
      pendingOps: 3,
      deadOps: 2,
      keywordsSupported: false,
      capabilities: ["IDLE", "CONDSTORE"],
      folders: [
        folder({}),
        folder({
          id: "f_2",
          name: "Stare",
          role: "user",
          messages: 1,
          error: "NO [NONEXISTENT]",
          errorCount: 1,
        }),
      ],
    });
    await renderApp("/settings/account/acc_1");

    expect(
      await screen.findByText("Brak połączenia z serwerem (imap.example.com)"),
    ).toBeOnTheScreen();
    expect(screen.getByText("Oczekujące operacje: 3")).toBeOnTheScreen();
    expect(screen.getByText("Nieudane operacje: 2")).toBeOnTheScreen();
    expect(screen.getByTestId("keywords-warning")).toHaveTextContent(
      /Etykiety tylko lokalnie – serwer nie obsługuje słów kluczowych/,
    );
    expect(within(screen.getByTestId("capabilities")).getByText("IDLE")).toBeOnTheScreen();
    expect(screen.getByText("Odebrane · 340 wiadomości")).toBeOnTheScreen();
    expect(screen.getByText("Folder · 1 wiadomość · NO [NONEXISTENT]")).toBeOnTheScreen();
  });

  it("says when the password stopped working and offers a new one", async () => {
    status = syncStatus({ state: "auth_failed" });
    await renderApp("/settings/account/acc_1");

    expect(await screen.findByText("Hasło przestało działać")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Zaktualizuj hasło"));
    expect(await screen.findByTestId("password-dialog")).toBeOnTheScreen();
  });

  it("resyncs with 'Synchronizuj teraz' (incremental) and 'Pełne porównanie' (full)", async () => {
    const modes: unknown[] = [];
    server.use(
      http.post(`${API}/accounts/acc_1/resync`, async ({ request }) => {
        modes.push(await request.json());
        return new HttpResponse(null, { status: 202 });
      }),
    );
    await renderApp("/settings/account/acc_1");

    await fireEvent.press(await screen.findByText("Synchronizuj teraz"));
    await waitFor(() => expect(modes).toEqual([{ mode: "incremental" }]));
    await waitFor(() => expect(screen.getByTestId("full-compare")).toBeEnabled());
    await fireEvent.press(screen.getByTestId("full-compare"));
    await waitFor(() => expect(modes).toEqual([{ mode: "incremental" }, { mode: "full" }]));
  });

  it("renames the account with PATCH", async () => {
    await renderApp("/settings/account/acc_1");

    await fireEvent.press(await screen.findByTestId("account-name"));
    const field = await screen.findByLabelText("Nazwa wyświetlana");
    await fireEvent.changeText(field, "Alicja Nowak");
    await fireEvent.press(screen.getByTestId("name-dialog-submit"));

    await waitFor(() => expect(patches).toEqual([{ displayName: "Alicja Nowak" }]));
    await waitFor(() => expect(screen.queryByTestId("name-dialog")).toBeNull());
    await waitFor(() =>
      expect(
        within(screen.getByTestId("account-name")).getByText("Alicja Nowak"),
      ).toBeOnTheScreen(),
    );
  });

  it("toggles sentAppend with PATCH", async () => {
    await renderApp("/settings/account/acc_1");
    await fireEvent.press(await screen.findByRole("switch", { name: /Zapisuj wysłane/ }));
    await waitFor(() => expect(patches).toEqual([{ sentAppend: false }]));
  });

  it("changes the password with PATCH and shows the server's refusal", async () => {
    await renderApp("/settings/account/acc_1");

    await fireEvent.press(await screen.findByTestId("change-password"));
    await fireEvent.changeText(await screen.findByLabelText("Nowe hasło"), "zle");
    await fireEvent.press(screen.getByTestId("password-dialog-submit"));
    expect(
      await screen.findByText(/Nieprawidłowe dane konta\.\s+empty password/),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText("Nowe hasło"), "nowe-haslo");
    await fireEvent.press(screen.getByTestId("password-dialog-submit"));

    await waitFor(() => expect(screen.queryByTestId("password-dialog")).toBeNull());
    expect(patches).toEqual([{ password: "zle" }, { password: "nowe-haslo" }]);
    expect(await screen.findByText("Hasło zmienione")).toBeOnTheScreen();
    expect(screen.queryByText(/nowe-haslo/)).toBeNull();
  });

  it("removes the active account with DELETE and opens the next one", async () => {
    const deleted: string[] = [];
    server.use(
      http.delete(`${API}/accounts/:id`, ({ params }) => {
        deleted.push(String(params.id));
        accounts = accounts.filter((a) => a.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const app = await renderApp("/settings/account/acc_1");

    await fireEvent.press(await screen.findByTestId("remove-account"));
    expect(
      await screen.findByText(
        "Usunie cache i ustawienia tego konta w Silo. Skrzynka na serwerze pozostaje nietknięta.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("remove-confirm"));

    await waitFor(() => expect(deleted).toEqual(["acc_1"]));
    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
  });
});
