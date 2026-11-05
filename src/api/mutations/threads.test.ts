import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { label, labels, thread, threadPage } from "../../test/fixtures";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { useAuth } from "../../state/auth";
import { hideToast, useToasts } from "../../state/toasts";
import { keys } from "../keys";
import type { ThreadLists } from "./cache";
import {
  handleOperationFailed,
  isThreadOpRunning,
  runThreadAction,
  specFor,
  type ThreadActionInput,
} from "./threads";

setupMsw();

const UNDO_UNTIL = "2099-01-01T00:00:00Z";
let qc: QueryClient;
let bodies: { path: string; body: unknown }[];

function lists(threads: ReturnType<typeof thread>[]): ThreadLists {
  return { pages: [threadPage(threads)], pageParams: [undefined] };
}
const rows = (labelId?: string) =>
  qc
    .getQueryData<ThreadLists>(keys.threads("acc_1", labelId ? { labelId } : {}))!
    .pages.flatMap((p) => p.threads ?? []);

/** Answers a thread endpoint with an operation result and records the body. */
function answer(path: string, threads: ReturnType<typeof thread>[], undoUntil = UNDO_UNTIL) {
  server.use(
    http.post(`${API}${path}`, async ({ request }) => {
      bodies.push({ path, body: await request.json().catch(() => null) });
      return HttpResponse.json({ threads, operationId: "op_1", undoUntil });
    }),
  );
}

const input = (over: Partial<ThreadActionInput>): ThreadActionInput => ({
  accountId: "acc_1",
  ids: ["t_1"],
  action: "archive",
  ...over,
});

beforeEach(() => {
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
  hideToast();
  bodies = [];
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(keys.threads("acc_1", { labelId: "INBOX" }), lists([thread({ id: "t_1" })]));
  qc.setQueryData(keys.labels("acc_1"), {
    labels: [...labels, label({ id: "l_9", name: "Projekty", type: "folder" })],
  });
});

describe("runThreadAction", () => {
  it("archives optimistically, writes the server answer and offers Cofnij until undoUntil", async () => {
    answer("/threads/modify", [thread({ id: "t_1", labelIds: [], subject: "Z serwera" })]);
    const done = runThreadAction(qc, input({}));
    // The row leaves the Inbox before the server answers.
    expect(rows("INBOX")).toEqual([]);
    await done;

    expect(bodies).toEqual([
      {
        path: "/threads/modify",
        body: { ids: ["t_1"], addLabelIds: [], removeLabelIds: ["INBOX"] },
      },
    ]);
    const current = useToasts.getState().current!;
    expect(current.message).toBe("Wątek zarchiwizowany");
    expect(current.action?.label).toBe("Cofnij");
    expect(current.hideAt).toBe(Date.parse(UNDO_UNTIL));
    expect(isThreadOpRunning(qc)).toBe(false);
  });

  it("Cofnij restores the snapshot at once and asks the server to undo", async () => {
    answer("/threads/modify", [thread({ id: "t_1", labelIds: [] })]);
    let undone = 0;
    server.use(
      http.post(`${API}/operations/:id/undo`, ({ params }) => {
        undone++;
        expect(params.id).toBe("op_1");
        return HttpResponse.json({
          threads: [thread({ id: "t_1", subject: "Przywrócony" })],
          operationId: "op_2",
          undoUntil: null,
        });
      }),
    );
    await runThreadAction(qc, input({}));

    useToasts.getState().current!.action!.onPress();
    expect(rows("INBOX").map((r) => r.id)).toEqual(["t_1"]);
    expect(useToasts.getState().current).toBeNull();
    await new Promise((r) => setTimeout(r, 50));
    expect(undone).toBe(1);
    expect(rows("INBOX")[0]?.subject).toBe("Przywrócony");
  });

  it("undo answered 409 undo_expired says it can no longer be undone", async () => {
    answer("/threads/modify", [thread({ id: "t_1", labelIds: [] })]);
    server.use(
      http.post(`${API}/operations/:id/undo`, () =>
        HttpResponse.json(
          { status: 409, title: "Conflict", code: "undo_expired" },
          { status: 409, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    await runThreadAction(qc, input({}));
    useToasts.getState().current!.action!.onPress();
    await new Promise((r) => setTimeout(r, 50));
    expect(useToasts.getState().current?.message).toBe("Tej operacji nie można już cofnąć.");
  });

  it("rolls back and says so when the request fails", async () => {
    server.use(http.post(`${API}/threads/modify`, () => HttpResponse.json({}, { status: 500 })));
    await runThreadAction(qc, input({}));
    expect(rows("INBOX").map((r) => r.id)).toEqual(["t_1"]);
    expect(useToasts.getState().current?.message).toBe("Nie udało się. Spróbuj ponownie.");
  });

  it("trash goes to /threads/trash", async () => {
    answer("/threads/trash", [thread({ id: "t_1", labelIds: ["TRASH"] })]);
    await runThreadAction(qc, input({ action: "trash" }));
    expect(bodies).toEqual([{ path: "/threads/trash", body: { ids: ["t_1"] } }]);
    expect(useToasts.getState().current?.message).toBe("Wątek przeniesiony do kosza");
  });

  it("delete forever goes to /threads/delete without Cofnij", async () => {
    answer("/threads/delete", [], null as unknown as string);
    const done = runThreadAction(qc, input({ action: "deleteForever" }));
    expect(rows("INBOX")).toEqual([]);
    await done;
    expect(bodies).toEqual([{ path: "/threads/delete", body: { ids: ["t_1"] } }]);
    expect(useToasts.getState().current?.message).toBe("Wątek usunięty trwale");
    expect(useToasts.getState().current?.action).toBeUndefined();
  });

  it("star is silent", async () => {
    answer("/threads/modify", [thread({ id: "t_1", labelIds: ["INBOX", "STARRED"] })], null!);
    const done = runThreadAction(qc, input({ action: "star" }));
    expect(rows("INBOX")[0]?.labelIds).toEqual(["INBOX", "STARRED"]);
    await done;
    expect(useToasts.getState().current).toBeNull();
  });

  it("serialises operations on the same thread", async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.post(`${API}/threads/modify`, async ({ request }) => {
        const body = (await request.json()) as { addLabelIds: string[] };
        const name = body.addLabelIds[0] ?? "archive";
        order.push(`start ${name}`);
        if (name === "archive") await gate;
        order.push(`end ${name}`);
        return HttpResponse.json({ threads: [], operationId: null, undoUntil: null });
      }),
    );
    const first = runThreadAction(qc, input({}));
    const second = runThreadAction(qc, input({ action: "star" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(order).toEqual(["start archive"]);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["start archive", "end archive", "start STARRED", "end STARRED"]);
  });
});

describe("handleOperationFailed", () => {
  it("restores the operation's snapshot and explains it by kind", async () => {
    answer("/threads/modify", [thread({ id: "t_1", labelIds: [] })]);
    await runThreadAction(qc, input({}));
    expect(rows("INBOX")).toEqual([]);

    handleOperationFailed(qc, {
      operationId: "op_1",
      accountId: "acc_1",
      kind: "move",
      threadIds: ["t_1"],
    });
    expect(rows("INBOX").map((r) => r.id)).toEqual(["t_1"]);
    expect(useToasts.getState().current?.message).toBe(
      "Nie udało się przenieść 1 wątku na serwerze poczty – przywrócono stan z serwera",
    );
  });
});

describe("specFor moveTo", () => {
  const spec = (target: string, viewLabelId?: string) =>
    specFor(qc, input({ action: "moveTo", target, viewLabelId }));

  it("a user label adds it and leaves the Inbox", () => {
    expect(spec("l_1")).toMatchObject({ endpoint: "modify", add: ["l_1"], remove: ["INBOX"] });
  });

  it("a folder, Inbox or Spam only adds the target (the server leaves the old location)", () => {
    expect(spec("l_9")).toMatchObject({ endpoint: "modify", add: ["l_9"], remove: [] });
    expect(spec("l_9").leave).toEqual(["INBOX", "SPAM", "TRASH"]);
    expect(spec("SPAM")).toMatchObject({ add: ["SPAM"], remove: [] });
    expect(spec("INBOX")).toMatchObject({ add: ["INBOX"], remove: [] });
  });

  it("Trash goes to the trash endpoint, Archive leaves the Inbox", () => {
    expect(spec("TRASH").endpoint).toBe("trash");
    expect(spec("ARCHIVE")).toMatchObject({ endpoint: "modify", add: [], remove: ["INBOX"] });
  });

  it("archive in a folder leaves the folder, in a user label also the label", () => {
    expect(specFor(qc, input({ viewLabelId: "l_9" })).remove).toEqual(["l_9"]);
    expect(specFor(qc, input({ viewLabelId: "l_1" })).remove).toEqual(["INBOX", "l_1"]);
  });

  it("names the target in the snackbar", () => {
    expect(spec("l_1").message?.(1)).toBe("Wątek przeniesiony do: Praca");
    expect(spec("INBOX").message?.(2)).toBe("2 wątki przeniesione do: Odebrane");
  });
});
