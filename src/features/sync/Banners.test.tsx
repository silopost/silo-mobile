import { act, fireEvent, screen, waitFor } from "expo-router/testing-library";
import { setConnection } from "../../state/connection";
import { http, HttpResponse } from "msw";
import { labels, sessionBody, syncStatus, threadPage } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";
import { isInitialSync, progressPercent } from "./useSync";

setupMsw();

let resyncBodies: unknown[];

function serveStatus(status: ReturnType<typeof syncStatus>) {
  server.use(http.get(`${API}/accounts/acc_1/sync-status`, () => HttpResponse.json(status)));
}

beforeEach(() => {
  resetAuth();
  signIn();
  resyncBodies = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/threads`, () => HttpResponse.json(threadPage([]))),
    http.post(`${API}/accounts/acc_1/resync`, async ({ request }) => {
      resyncBodies.push(await request.json());
      return new HttpResponse(null, { status: 202 });
    }),
  );
});

describe("sync banners", () => {
  it("shows nothing for a live account", async () => {
    serveStatus(syncStatus({}));
    await renderApp("/u/0/inbox");
    await screen.findByText("Brak wiadomości w Odebranych");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByTestId("banner-initial-sync")).toBeNull();
  });

  it("tells when Silo itself is unreachable, and nothing while polling", async () => {
    serveStatus(syncStatus({}));
    await renderApp("/u/0/inbox");
    await screen.findByText("Brak wiadomości w Odebranych");

    await act(async () => setConnection("offline"));
    expect(screen.getByText("Brak połączenia z Silo. Ponawiam…")).toBeOnTheScreen();

    await act(async () => setConnection("polling"));
    expect(screen.queryByTestId("banner-offline")).toBeNull();
  });

  it("asks for a new password when the mailbox rejects it", async () => {
    serveStatus(syncStatus({ state: "auth_failed" }));
    const app = await renderApp("/u/0/inbox");
    expect(await screen.findByText("Hasło do skrzynki przestało działać")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Zaktualizuj hasło"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/account/acc_1"));
  });

  it("names the offline mail server, the pending changes and retries", async () => {
    serveStatus(syncStatus({ state: "backoff", pendingOps: 5 }));
    await renderApp("/u/0/inbox");
    expect(
      await screen.findByText(
        "Brak połączenia z serwerem poczty (imap.example.com). 5 zmian oczekuje.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Ponów teraz"));
    await waitFor(() => expect(resyncBodies).toEqual([{ mode: "incremental" }]));
  });

  it("shows the progress of the initial sync", async () => {
    serveStatus(
      syncStatus({
        state: "initial_sync",
        initialSyncDoneAt: null,
        initialSync: {
          phase: "headers",
          messagesDone: 1200,
          messagesTotal: 4800,
          foldersDone: 1,
          foldersTotal: 4,
          bytesDone: 0,
          bytesTotal: 0,
        },
      }),
    );
    await renderApp("/u/0/inbox");
    // Polish groups digits from five up: "1200", "12 000" (with a no-break space).
    expect(
      await screen.findByText(/^Synchronizacja: 1\s?200 z 4\s?800 wiadomości$/),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Postęp pierwszej synchronizacji")).toBeOnTheScreen();
  });
});

describe("sync helpers", () => {
  it("computes the progress and the initial-sync state", () => {
    const s = syncStatus({
      state: "initial_sync",
      initialSyncDoneAt: null,
      initialSync: {
        ...syncStatus({}).initialSync,
        phase: "bodies",
        messagesDone: 1,
        messagesTotal: 3,
      },
    });
    expect(progressPercent(s)).toBe(33);
    expect(isInitialSync(s)).toBe(true);
    expect(progressPercent(syncStatus({}))).toBeNull();
    expect(isInitialSync(syncStatus({}))).toBe(false);
  });
});
