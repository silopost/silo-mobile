import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import {
  draft,
  labels,
  message,
  sessionBody,
  thread,
  threadDetail,
  threadPage,
} from "../test/fixtures";
import { formatWhen } from "../lib/format";
import { hideToast, useToasts } from "../state/toasts";
import { renderApp, signIn } from "../test/router";
import { API, server, serveMeta, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";
import { defaultUi, useUi } from "../state/ui";

type Detail = components["schemas"]["ThreadDetail"];

setupMsw();

let modifies: { ids: string[]; addLabelIds?: string[]; removeLabelIds?: string[] }[];
let drafts: unknown[];

function serve(detail: Detail | null) {
  server.use(
    http.get(`${API}/threads/t_1`, () =>
      detail
        ? HttpResponse.json(detail)
        : HttpResponse.json({ code: "not_found", status: 404 }, { status: 404 }),
    ),
  );
}

beforeEach(() => {
  resetAuth();
  hideToast();
  useUi.setState({ ...defaultUi });
  signIn();
  modifies = [];
  drafts = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json({}, { status: 404 })),
    http.get(`${API}/threads`, () => HttpResponse.json(threadPage([thread({})]))),
    http.get(`${API}/messages/:id/html`, () =>
      HttpResponse.text("<p>x</p>", { headers: { "Content-Type": "text/html" } }),
    ),
    http.post(`${API}/threads/modify`, async ({ request }) => {
      const body = (await request.json()) as (typeof modifies)[number];
      modifies.push(body);
      return HttpResponse.json({
        operationId: "op_1",
        threads: [],
        undoUntil: new Date(Date.now() + 10_000).toISOString(),
      });
    }),
    http.post(`${API}/drafts`, async ({ request }) => {
      drafts.push(await request.json());
      return HttpResponse.json(
        {
          id: "d_7",
          accountId: "acc_1",
          threadId: "t_1",
          messageId: "m_7",
          attachments: null,
          bcc: null,
          cc: null,
          to: null,
          bodyHtml: "",
          bodyJson: null,
          inReplyToMessageId: "m_3",
          lastSend: null,
          serverChanged: false,
          subject: "Re: Oferta na Q4",
          syncedVersion: 0,
          updatedAt: "2026-11-05T10:00:00Z",
          version: 1,
        },
        { status: 201 },
      );
    }),
  );
});

const three = () =>
  threadDetail([
    message({ id: "m_1", snippet: "Pierwsza" }),
    message({ id: "m_2", snippet: "Druga", labelIds: ["INBOX", "UNREAD"] }),
    message({ id: "m_3", snippet: "Trzecia" }),
  ]);

describe("ThreadScreen", () => {
  it("shows the subject, unread and last messages expanded, the rest collapsed", async () => {
    serve(three());
    await renderApp("/u/0/inbox/t_1");

    expect(await screen.findByText("Oferta na Q4")).toBeOnTheScreen();
    expect(await screen.findByTestId("chip-INBOX")).toHaveTextContent("Odebrane");
    const m1 = await screen.findByTestId("message-m_1");
    expect(screen.queryByTestId("message-html-m_1")).toBeNull();
    expect(await screen.findByTestId("message-html-m_2")).toBeOnTheScreen();
    expect(await screen.findByTestId("message-html-m_3")).toBeOnTheScreen();

    await fireEvent.press(m1);
    expect(await screen.findByTestId("message-html-m_1")).toBeOnTheScreen();
  });

  it("folds three or more collapsed messages into one bar", async () => {
    serve(
      threadDetail(
        ["m_1", "m_2", "m_3", "m_4", "m_5"].map((id) => message({ id, snippet: `S ${id}` })),
      ),
    );
    await renderApp("/u/0/inbox/t_1");

    const fold = await screen.findByRole("button", { name: "Pokaż 3 zwinięte wiadomości" });
    expect(screen.getByTestId("message-m_1")).toBeOnTheScreen();
    expect(screen.queryByTestId("message-m_3")).toBeNull();
    await fireEvent.press(fold);
    expect(screen.getByTestId("message-m_3")).toBeOnTheScreen();
  });

  it("marks an unread thread read once, silently", async () => {
    serve({ ...three(), labelIds: ["INBOX", "UNREAD"] });
    await renderApp("/u/0/inbox/t_1");

    await waitFor(() => expect(modifies).toHaveLength(1));
    expect(modifies[0]).toEqual({ ids: ["t_1"], addLabelIds: [], removeLabelIds: ["UNREAD"] });
    await screen.findByTestId("message-html-m_3");
    expect(modifies).toHaveLength(1);
  });

  it("does not mark a read thread", async () => {
    serve(three());
    await renderApp("/u/0/inbox/t_1");
    await screen.findByTestId("message-html-m_3");
    expect(modifies).toHaveLength(0);
  });

  it("does not mark an unread thread read with markReadOnOpen off", async () => {
    useUi.setState({ markReadOnOpen: false });
    serve({ ...three(), labelIds: ["INBOX", "UNREAD"] });
    await renderApp("/u/0/inbox/t_1");
    await screen.findByTestId("message-html-m_3");
    expect(modifies).toHaveLength(0);
  });

  it("asks before moving to Trash with confirmTrash on", async () => {
    useUi.setState({ confirmTrash: true });
    const trashed: unknown[] = [];
    server.use(
      http.post(`${API}/threads/trash`, async ({ request }) => {
        trashed.push(await request.json());
        return HttpResponse.json({
          operationId: "op_2",
          threads: [],
          undoUntil: new Date(Date.now() + 10_000).toISOString(),
        });
      }),
    );
    serve(three());
    const app = await renderApp("/u/0/inbox/t_1");

    await fireEvent.press(await screen.findByLabelText("Usuń"));
    expect(await screen.findByText("Przenieść wątek do kosza?")).toBeOnTheScreen();
    expect(app.getPathname()).toBe("/u/0/inbox/t_1");
    expect(trashed).toEqual([]);

    await fireEvent.press(within(screen.getByTestId("confirm-action-dialog")).getByText("Usuń"));

    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox"));
    await waitFor(() => expect(trashed).toEqual([{ ids: ["t_1"] }]));
  });

  it("does not move to Trash when the confirmation is cancelled", async () => {
    useUi.setState({ confirmTrash: true });
    serve(three());
    const app = await renderApp("/u/0/inbox/t_1");

    await fireEvent.press(await screen.findByLabelText("Usuń"));
    await fireEvent.press(await screen.findByText("Anuluj"));

    await waitFor(() => expect(screen.queryByTestId("confirm-action-dialog")).toBeNull());
    expect(app.getPathname()).toBe("/u/0/inbox/t_1");
  });

  it("archives from the bar and returns to the list", async () => {
    serve(three());
    const app = await renderApp("/u/0/inbox/t_1");

    await fireEvent.press(await screen.findByLabelText("Archiwizuj"));

    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox"));
    await waitFor(() =>
      expect(modifies).toContainEqual({ ids: ["t_1"], addLabelIds: [], removeLabelIds: ["INBOX"] }),
    );
  });

  it("offers 'To nie spam' and delete forever in Spam", async () => {
    serve({ ...three(), labelIds: ["SPAM"] });
    await renderApp("/u/0/spam/t_1");
    expect(await screen.findByLabelText("To nie spam")).toBeOnTheScreen();
    expect(screen.getByLabelText("Usuń na zawsze")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Archiwizuj")).toBeNull();
  });

  it("replies to the last message with POST /drafts and opens compose", async () => {
    serve(three());
    const app = await renderApp("/u/0/inbox/t_1");

    await fireEvent.press(await screen.findByText("Odpowiedz wszystkim"));

    await waitFor(() => expect(app.getPathname()).toBe("/compose"));
    expect(drafts).toEqual([{ replyToMessageId: "m_3", mode: "replyAll" }]);
    expect(app.getSearchParams()).toMatchObject({ draftId: "d_7" });
  });

  it("opens a draft of the thread in compose", async () => {
    serve(
      threadDetail([
        message({ id: "m_1" }),
        message({ id: "m_4", draftId: "d_4", labelIds: ["DRAFT"], snippet: "Szkic" }),
      ]),
    );
    const app = await renderApp("/u/0/inbox/t_1");

    await fireEvent.press(await screen.findByRole("button", { name: "Wersja robocza, Szkic" }));

    await waitFor(() => expect(app.getPathname()).toBe("/compose"));
    expect(app.getSearchParams()).toMatchObject({ draftId: "d_4" });
  });

  it("says when the thread does not exist", async () => {
    serve(null);
    await renderApp("/u/0/inbox/t_1");
    expect(await screen.findByText("Nie znaleziono wątku")).toBeOnTheScreen();
  });
});

describe("ThreadScreen, phase 4", () => {
  const at = "2026-11-07T07:00:00Z";

  it("a scheduled message says when it leaves; Anuluj wysyłkę cancels and opens the draft", async () => {
    let cancels = 0;
    server.use(
      http.post(`${API}/outbound/ob_9/cancel`, () => {
        cancels += 1;
        return HttpResponse.json(draft({ id: "d_5", subject: "Plan" }));
      }),
      http.get(`${API}/drafts/d_5`, () => HttpResponse.json(draft({ id: "d_5", subject: "Plan" }))),
      http.get(`${API}/contacts/autocomplete`, () => HttpResponse.json({ contacts: [] })),
    );
    serve({
      ...threadDetail([message({ labelIds: ["SCHEDULED"] })]),
      labelIds: ["SCHEDULED"],
      scheduledAt: at,
      outboundId: "ob_9",
    });
    const app = await renderApp("/u/0/scheduled/t_1");

    expect(await screen.findByTestId("thread-scheduled")).toHaveTextContent(
      `Zaplanowano na ${formatWhen(at)}`,
      { exact: false },
    );
    await fireEvent.press(screen.getByText("Anuluj wysyłkę"));
    await waitFor(() => expect(app.getPathname()).toBe("/compose"));
    expect(cancels).toBe(1);
    expect(app.getSearchParams()).toMatchObject({ draftId: "d_5" });
  });

  it("409 send_in_progress says the message is being sent", async () => {
    server.use(
      http.post(`${API}/outbound/ob_9/cancel`, () =>
        HttpResponse.json({ code: "send_in_progress", status: 409 }, { status: 409 }),
      ),
    );
    serve({
      ...threadDetail([message({ labelIds: ["SCHEDULED"] })]),
      labelIds: ["SCHEDULED"],
      scheduledAt: at,
      outboundId: "ob_9",
    });
    await renderApp("/u/0/scheduled/t_1");
    await fireEvent.press(await screen.findByText("Anuluj wysyłkę"));
    await waitFor(() =>
      expect(useToasts.getState().current?.message).toBe("Ta wiadomość jest już wysyłana."),
    );
  });

  it("a snoozed thread says until when and offers Anuluj odłożenie", async () => {
    serveMeta("0.4.0");
    serve({ ...three(), labelIds: ["SNOOZED"], snoozedUntil: at });
    await renderApp("/u/0/snoozed/t_1");
    expect(await screen.findByTestId("thread-snoozed")).toHaveTextContent(
      `Odłożono do ${formatWhen(at)}`,
      { exact: false },
    );
    await fireEvent.press(screen.getByLabelText("Więcej opcji"));
    expect(await screen.findByText("Anuluj odłożenie")).toBeOnTheScreen();
  });
});
