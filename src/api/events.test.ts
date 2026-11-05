import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { label, syncStatus, thread, threadPage } from "../test/fixtures";
import { useCompose } from "../state/compose";
import { hideToast, useToasts } from "../state/toasts";
import { applyEvent } from "./events";
import { keys } from "./keys";
import type { LabelsData, ThreadLists } from "./mutations/cache";
import type { SyncStatus, ThreadDetail } from "./types";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const ME = "silo-mobile/0.1.0#inst_1";
let qc: QueryClient;

const lists = (threads: ReturnType<typeof thread>[]): ThreadLists => ({
  pages: [threadPage(threads)],
  pageParams: [undefined],
});
const rows = (filter = {}) =>
  qc.getQueryData<ThreadLists>(keys.threads("acc_1", filter))!.pages.flatMap((p) => p.threads!);
const invalid = (key: readonly unknown[]) => qc.getQueryState(key)?.isInvalidated;

beforeEach(() => {
  qc = new QueryClient();
  hideToast();
  useCompose.setState({ remoteVersions: {} });
  (router.push as jest.Mock).mockClear();
  qc.setQueryData(keys.threads("acc_1", {}), lists([thread({}), thread({ id: "t_2" })]));
  qc.setQueryData(keys.threads("acc_1", { labelId: "INBOX" }), lists([thread({})]));
  qc.setQueryData(keys.labels("acc_1"), {
    labels: [label({ id: "INBOX", threadsUnread: 1, threadsTotal: 2 }), label({ id: "l_1" })],
  });
  qc.setQueryData(keys.syncStatus("acc_1"), syncStatus({}));
  qc.setQueryData(keys.session, { accounts: [] });
  qc.setQueryData(keys.thread("t_1"), { id: "t_1", labelIds: ["INBOX"] } as ThreadDetail);
});

describe("applyEvent", () => {
  it("message.new refetches the account's lists", () => {
    applyEvent(qc, "message.new", { accountId: "acc_1", threadId: "t_9" });
    expect(invalid(keys.threads("acc_1", {}))).toBe(true);
    expect(invalid(keys.labels("acc_1"))).toBe(false);
  });

  it("thread.updated patches the row and the open thread in place", () => {
    applyEvent(qc, "thread.updated", {
      accountId: "acc_1",
      threadId: "t_1",
      labelIds: ["INBOX", "STARRED", "UNREAD"],
      unreadCount: 1,
      pendingSync: true,
    });
    expect(rows()[0]).toMatchObject({ labelIds: ["INBOX", "STARRED", "UNREAD"], unreadCount: 1 });
    expect(rows()[0]!.pendingSync).toBe(true);
    expect(qc.getQueryData<ThreadDetail>(keys.thread("t_1"))!.labelIds).toContain("STARRED");
    expect(invalid(keys.threads("acc_1", {}))).toBe(false);
  });

  it("thread.updated drops a row that left the list and refetches for new ones", () => {
    applyEvent(qc, "thread.updated", { accountId: "acc_1", threadId: "t_1", labelIds: [] });
    expect(rows({ labelId: "INBOX" })).toEqual([]);

    applyEvent(qc, "thread.updated", { accountId: "acc_1", threadId: "t_9", labelIds: ["INBOX"] });
    expect(invalid(keys.threads("acc_1", { labelId: "INBOX" }))).toBe(true);
  });

  it("thread.updated with a new message refetches the order and the thread", () => {
    applyEvent(qc, "thread.updated", {
      accountId: "acc_1",
      threadId: "t_1",
      labelIds: ["INBOX"],
      messageCount: 2,
      lastMessageAt: "2026-11-05T10:00:00Z",
      snippet: "Nowa odpowiedź",
    });
    expect(rows()[0]).toMatchObject({ messageCount: 2, snippet: "Nowa odpowiedź" });
    expect(invalid(keys.threads("acc_1", {}))).toBe(true);
    expect(invalid(keys.thread("t_1"))).toBe(true);
  });

  it("ignores its own thread.updated while a thread operation is in flight", () => {
    void new MutationObserver(qc, {
      mutationKey: ["threads-op"],
      mutationFn: () => new Promise(() => {}),
    }).mutate();
    const event = { accountId: "acc_1", threadId: "t_1", labelIds: ["TRASH"], origin: ME };
    applyEvent(qc, "thread.updated", event, ME);
    expect(rows()[0]!.labelIds).toEqual(["INBOX"]);

    // Another device's change is applied even then.
    applyEvent(qc, "thread.updated", { ...event, origin: "silo-web/1#x" }, ME);
    expect(rows().map((r) => r.id)).toEqual(["t_2"]);
  });

  it("thread.deleted removes the row and the cached thread", () => {
    applyEvent(qc, "thread.deleted", { accountId: "acc_1", threadId: "t_1" });
    expect(rows().map((r) => r.id)).toEqual(["t_2"]);
    expect(qc.getQueryData(keys.thread("t_1"))).toBeUndefined();
  });

  it("thread.merged refetches the lists and the thread merged into", () => {
    qc.setQueryData(keys.thread("t_2"), { id: "t_2" } as ThreadDetail);
    applyEvent(qc, "thread.merged", { accountId: "acc_1", threadId: "t_1", intoId: "t_2" });
    expect(invalid(keys.threads("acc_1", {}))).toBe(true);
    expect(invalid(keys.thread("t_2"))).toBe(true);
  });

  it("label.counts updates the counters of /labels", () => {
    applyEvent(qc, "label.counts", {
      accountId: "acc_1",
      labels: [{ id: "INBOX", threadsUnread: 4, threadsTotal: 9 }, { id: "bad" }],
    });
    const data = qc.getQueryData<LabelsData>(keys.labels("acc_1"))!;
    expect(data.labels![0]).toMatchObject({ threadsUnread: 4, threadsTotal: 9 });
    expect(invalid(keys.labels("acc_1"))).toBe(false);
  });

  it("label.changed refetches the labels", () => {
    applyEvent(qc, "label.changed", { accountId: "acc_1", labelId: "l_1" });
    expect(invalid(keys.labels("acc_1"))).toBe(true);
  });

  it("operation.failed restores the server state and explains it", () => {
    applyEvent(qc, "operation.failed", {
      accountId: "acc_1",
      operationId: "op_x",
      kind: "move",
      threadIds: ["t_1"],
    });
    expect(invalid(keys.threads("acc_1", {}))).toBe(true);
    expect(invalid(keys.labels("acc_1"))).toBe(true);
    expect(invalid(keys.thread("t_1"))).toBe(true);
    expect(useToasts.getState().current?.message).toMatch(/^Nie udało się przenieść/);
  });

  it("draft.updated keeps the remote version of another device's save", () => {
    applyEvent(qc, "draft.updated", { accountId: "acc_1", draftId: "d_1", version: 3 }, ME);
    applyEvent(qc, "draft.updated", { draftId: "d_1", version: 4, origin: ME }, ME);
    applyEvent(qc, "draft.updated", { draftId: "d_1", version: 2 }, ME);
    expect(useCompose.getState().remoteVersions).toEqual({ d_1: 3 });
  });

  it("outbound.status failed offers to open the draft again", () => {
    applyEvent(qc, "outbound.status", { accountId: "acc_1", draftId: "d_1", status: "sent" });
    expect(invalid(keys.threads("acc_1", {}))).toBe(true);
    expect(useToasts.getState().current).toBeNull();

    applyEvent(qc, "outbound.status", { accountId: "acc_1", draftId: "d_1", status: "failed" });
    const shown = useToasts.getState().current!;
    expect(shown.message).toBe("Nie udało się wysłać");
    expect(shown.action?.label).toBe("Otwórz");
    shown.action!.onPress();
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/compose",
      params: { draftId: "d_1" },
    });
  });

  it("account.sync_progress updates the initial sync progress only", () => {
    applyEvent(qc, "account.sync_progress", {
      accountId: "acc_1",
      phase: "headers",
      messagesDone: 50,
      messagesTotal: 200,
      origin: "x",
    });
    const s = qc.getQueryData<SyncStatus>(keys.syncStatus("acc_1"))!;
    expect(s.initialSync).toMatchObject({ phase: "headers", messagesDone: 50, messagesTotal: 200 });
    expect(s.initialSync).not.toHaveProperty("origin");
    expect(invalid(keys.syncStatus("acc_1"))).toBe(false);
  });

  it.each(["account.status", "account.error"])("%s refetches the status and session", (type) => {
    applyEvent(qc, type, { accountId: "acc_1", state: "backoff" });
    expect(invalid(keys.syncStatus("acc_1"))).toBe(true);
    expect(invalid(keys.session)).toBe(true);
  });

  it("resync refetches everything", () => {
    applyEvent(qc, "resync", {});
    expect(invalid(keys.session)).toBe(true);
    expect(invalid(keys.labels("acc_1"))).toBe(true);
    expect(invalid(keys.thread("t_1"))).toBe(true);
  });

  it("ignores unknown types and malformed payloads", () => {
    applyEvent(qc, "something.new", { accountId: "acc_1" });
    applyEvent(qc, "thread.updated", { accountId: 1, threadId: null });
    applyEvent(qc, "label.counts", { accountId: "acc_1", labels: "no" });
    expect(invalid(keys.threads("acc_1", {}))).toBe(false);
  });
});
