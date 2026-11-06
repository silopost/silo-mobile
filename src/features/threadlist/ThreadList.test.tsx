import { act, fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { DeviceEventEmitter } from "react-native";
import { labels, sessionBody, thread, threadPage } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";
import { useSelection } from "../../state/selection";
import { hideToast } from "../../state/toasts";

setupMsw();

type Req = { labelId: string | null; cursor: string | null; limit: string | null };
let requests: Req[];
let labelRequests: number;

const page1 = threadPage(
  [
    thread({ id: "t_1", subject: "Oferta na Q4", unreadCount: 1 }),
    thread({
      id: "t_2",
      subject: "Faktura",
      participants: [{ email: "ewa@x.pl", name: "Ewa Nowak", unread: false }],
    }),
  ],
  "c_2",
);
const page2 = threadPage([thread({ id: "t_3", subject: "Spotkanie" })]);

function serve(pages: Record<string, ReturnType<typeof threadPage>>) {
  server.use(
    http.get(`${API}/threads`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      requests.push({ labelId: q.get("labelId"), cursor: q.get("cursor"), limit: q.get("limit") });
      return HttpResponse.json(pages[q.get("cursor") ?? ""] ?? threadPage([]));
    }),
  );
}

/** Answers POST /threads/modify with an undoable operation; returns the recorded bodies. */
function recordModify(): unknown[] {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/threads/modify`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        threads: [],
        operationId: "op_1",
        undoUntil: new Date(Date.now() + 10_000).toISOString(),
      });
    }),
  );
  return bodies;
}

beforeEach(() => {
  resetAuth();
  signIn();
  requests = [];
  labelRequests = 0;
  useSelection.getState().clear();
  hideToast();
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/labels`, () => {
      labelRequests++;
      return HttpResponse.json({ labels });
    }),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json({}, { status: 404 })),
  );
});

describe("thread list", () => {
  it("renders the rows of GET /threads and loads the next page at the end", async () => {
    serve({ "": page1, c_2: page2 });
    await renderApp("/u/0/inbox");

    expect(await screen.findByText("Oferta na Q4")).toBeOnTheScreen();
    expect(screen.getByText("Faktura")).toBeOnTheScreen();
    expect(requests[0]).toEqual({ labelId: "INBOX", cursor: null, limit: "50" });

    await act(async () => {
      screen.getByTestId("thread-list").props.onEndReached?.();
    });
    expect(await screen.findByText("Spotkanie")).toBeOnTheScreen();
    expect(requests.map((r) => r.cursor)).toEqual([null, "c_2"]);
  });

  it("pull-to-refresh refetches the list and the labels", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    await screen.findByText("Oferta na Q4");
    const before = { threads: requests.length, labels: labelRequests };

    await act(async () => {
      // FlashList hands the RefreshControl to its scroll view as a prop.
      screen.getByTestId("thread-list").props.refreshControl.props.onRefresh();
    });
    await waitFor(() => expect(requests.length).toBeGreaterThan(before.threads));
    expect(labelRequests).toBeGreaterThan(before.labels);
  });

  it("shows the empty state of the Inbox", async () => {
    serve({});
    await renderApp("/u/0/inbox");
    expect(await screen.findByText("Brak wiadomości w Odebranych")).toBeOnTheScreen();
  });

  it("shows Gmail's generic empty text in other labels", async () => {
    serve({});
    await renderApp("/u/0/starred");
    expect(await screen.findByText("Nic tu nie ma")).toBeOnTheScreen();
  });

  it("offers a retry after an error", async () => {
    let fail = true;
    server.use(
      http.get(`${API}/threads`, () =>
        fail
          ? HttpResponse.json({ title: "Internal", status: 500 }, { status: 500 })
          : HttpResponse.json(page1),
      ),
    );
    await renderApp("/u/0/inbox");
    const retry = await screen.findByText("Spróbuj ponownie", {}, { timeout: 5000 });
    fail = false;
    await fireEvent.press(retry);
    expect(await screen.findByText("Oferta na Q4")).toBeOnTheScreen();
  });

  it("bolds unread rows only", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    await screen.findByText("Oferta na Q4");
    expect(screen.getByTestId("thread-names-t_1")).toHaveStyle({ fontWeight: "700" });
    expect(screen.getByTestId("thread-names-t_2")).toHaveStyle({ fontWeight: "400" });
  });

  it("opens a thread on tap", async () => {
    serve({ "": page1 });
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByTestId("thread-t_2"));
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox/t_2"));
  });

  it("opens a draft in compose from the Drafts view", async () => {
    serve({
      "": threadPage([
        thread({ id: "t_9", subject: "Szkic", labelIds: ["DRAFT"], draftId: "d_4" }),
      ]),
    });
    const app = await renderApp("/u/0/drafts");
    await fireEvent.press(await screen.findByTestId("thread-t_9"));
    await waitFor(() => expect(app.getPathname()).toBe("/compose"));
    expect(app.getSearchParams().draftId).toBe("d_4");
  });

  it("a message waiting to be sent shows a clock and opens its thread, not compose", async () => {
    serve({
      "": threadPage([thread({ id: "t_8", subject: "Wychodząca", labelIds: ["SCHEDULED"] })]),
    });
    const app = await renderApp("/u/0/scheduled");
    const row = await screen.findByTestId("thread-t_8");
    expect(row.props.accessibilityLabel).toContain("zaplanowane");
    await fireEvent.press(row);
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/scheduled/t_8"));
  });

  it("long press starts selection; taps toggle rows", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");
    expect(screen.getByTestId("thread-t_1")).toBeSelected();

    await fireEvent.press(screen.getByTestId("thread-t_2"));
    expect([...useSelection.getState().ids].sort()).toEqual(["t_1", "t_2"]);
    expect(within(screen.getByTestId("thread-t_2")).getByRole("checkbox")).toBeChecked();
  });
});

describe("selection bar", () => {
  it("replaces the search bar with the count; X ends the selection", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");

    const bar = screen.getByTestId("selection-bar");
    expect(within(bar).getByLabelText("Zaznaczono: 1")).toHaveTextContent("1");
    expect(screen.queryByText("Szukaj w poczcie")).toBeNull();
    // t_1 is unread: the bar offers to mark it read.
    expect(within(bar).getByLabelText("Oznacz jako przeczytane")).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("thread-avatar-t_2"));
    expect(within(bar).getByLabelText("Zaznaczono: 2")).toBeOnTheScreen();

    await fireEvent.press(within(bar).getByLabelText("Zakończ zaznaczanie"));
    expect(screen.queryByTestId("selection-bar")).toBeNull();
    expect(screen.getByText("Szukaj w poczcie")).toBeOnTheScreen();
    expect(useSelection.getState().ids.size).toBe(0);
  });

  it("the back button ends the selection and stays on the list", async () => {
    serve({ "": page1 });
    const app = await renderApp("/u/0/inbox");
    await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");
    expect(screen.getByTestId("selection-bar")).toBeOnTheScreen();

    await act(async () => DeviceEventEmitter.emit("hardwareBackPress"));
    expect(screen.queryByTestId("selection-bar")).toBeNull();
    expect(app.getPathname()).toBe("/u/0/inbox");
  });

  it("runs an action on the selected threads and ends the selection", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    await fireEvent(await screen.findByTestId("thread-t_2"), "longPress");

    const bodies = recordModify();
    await fireEvent.press(screen.getByLabelText("Archiwizuj"));
    expect(screen.queryByTestId("selection-bar")).toBeNull();
    // The row leaves the Inbox at once; the snackbar offers Cofnij once the server answered.
    expect(screen.queryByText("Faktura")).toBeNull();
    expect(await screen.findByText("Wątek zarchiwizowany")).toBeOnTheScreen();
    expect(screen.getByText("Cofnij")).toBeOnTheScreen();
    expect(bodies).toEqual([{ ids: ["t_2"], addLabelIds: [], removeLabelIds: ["INBOX"] }]);
  });

  it("the star of a row stars the thread without a snackbar", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    const bodies = recordModify();
    const row = await screen.findByTestId("thread-t_2");
    await fireEvent.press(within(row).getByLabelText("Oznacz gwiazdką"));
    expect(within(row).getByLabelText("Usuń gwiazdkę")).toBeOnTheScreen();
    await waitFor(() =>
      expect(bodies).toEqual([{ ids: ["t_2"], addLabelIds: ["STARRED"], removeLabelIds: [] }]),
    );
    expect(screen.queryByText("Cofnij")).toBeNull();
  });

  it("'Przenieś do' moves the selection to the chosen label", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    const bodies = recordModify();
    await fireEvent(await screen.findByTestId("thread-t_2"), "longPress");
    await fireEvent.press(screen.getByLabelText("Więcej opcji"));
    await fireEvent.press(await screen.findByText("Przenieś do"));
    await fireEvent.press(within(await screen.findByTestId("move-to-sheet")).getByText("Praca"));

    expect(screen.queryByText("Faktura")).toBeNull();
    expect(await screen.findByText("Wątek przeniesiony do: Praca")).toBeOnTheScreen();
    expect(bodies).toEqual([{ ids: ["t_2"], addLabelIds: ["l_1"], removeLabelIds: ["INBOX"] }]);
  });

  it("'Etykiety' applies the checked labels with one request after OK", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    const bodies = recordModify();
    await fireEvent(await screen.findByTestId("thread-t_2"), "longPress");
    await fireEvent.press(screen.getByLabelText("Więcej opcji"));
    await fireEvent.press(await screen.findByRole("menuitem", { name: "Etykiety" }));
    const sheet = await screen.findByTestId("labels-sheet");
    await fireEvent.press(within(sheet).getByRole("checkbox", { name: "Praca" }));
    await fireEvent.press(within(sheet).getByRole("checkbox", { name: "Rachunki" }));
    await fireEvent.press(within(sheet).getByText("OK"));

    expect(await screen.findByText("Zmieniono etykiety wątku")).toBeOnTheScreen();
    expect(bodies).toEqual([{ ids: ["t_2"], addLabelIds: ["l_1", "l_2"], removeLabelIds: [] }]);
  });

  it("delete forever in Trash asks first and has no Cofnij", async () => {
    serve({ "": threadPage([thread({ id: "t_1", subject: "Stary", labelIds: ["TRASH"] })]) });
    const deleted: unknown[] = [];
    server.use(
      http.post(`${API}/threads/delete`, async ({ request }) => {
        deleted.push(await request.json());
        serve({ "": threadPage([]) }); // the refetch after the operation
        return HttpResponse.json({ threads: [], operationId: "op_9", undoUntil: null });
      }),
    );
    await renderApp("/u/0/trash");
    await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");
    await fireEvent.press(screen.getByLabelText("Usuń na zawsze"));

    const dialog = await screen.findByTestId("delete-forever-dialog");
    expect(
      within(dialog).getByText("Usunąć na zawsze 1 wątek? Tej operacji nie można cofnąć."),
    ).toBeOnTheScreen();
    expect(deleted).toEqual([]);
    await fireEvent.press(within(dialog).getByText("Usuń na zawsze"));

    expect(await screen.findByText("Wątek usunięty trwale")).toBeOnTheScreen();
    expect(screen.queryByText("Stary")).toBeNull();
    expect(screen.queryByText("Cofnij")).toBeNull();
    expect(deleted).toEqual([{ ids: ["t_1"] }]);
  });

  it("'Zaznacz wszystko' selects every loaded row", async () => {
    serve({ "": page1 });
    await renderApp("/u/0/inbox");
    await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");

    await fireEvent.press(screen.getByLabelText("Więcej opcji"));
    await fireEvent.press(await screen.findByText("Zaznacz wszystko"));
    expect([...useSelection.getState().ids].sort()).toEqual(["t_1", "t_2"]);
  });
});
