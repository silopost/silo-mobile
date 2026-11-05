import { QueryClient } from "@tanstack/react-query";
import { label, labels, thread, threadPage } from "../../test/fixtures";
import { keys } from "../keys";
import {
  applyOptimistic,
  locationLabelIds,
  mergeServerThreads,
  patchLabelIds,
  removeFromLists,
  restoreSnapshot,
  takeSnapshot,
  type ThreadLists,
} from "./cache";

const lists = (threads: ReturnType<typeof thread>[]): ThreadLists => ({
  pages: [threadPage(threads)],
  pageParams: [undefined],
});

function setup() {
  const qc = new QueryClient();
  qc.setQueryData(keys.threads("acc_1", { labelId: "INBOX" }), lists([thread({ id: "t_1" })]));
  qc.setQueryData(keys.threads("acc_1", {}), lists([thread({ id: "t_1" })]));
  qc.setQueryData(keys.labels("acc_1"), {
    labels: [...labels, label({ id: "l_9", name: "Projekty", type: "folder" })],
  });
  return qc;
}

const rows = (qc: QueryClient, labelId?: string) =>
  qc
    .getQueryData<ThreadLists>(keys.threads("acc_1", labelId ? { labelId } : {}))!
    .pages.flatMap((p) => p.threads ?? []);
const inbox = (qc: QueryClient) =>
  qc
    .getQueryData<{ labels: typeof labels }>(keys.labels("acc_1"))!
    .labels.find((l) => l.id === "INBOX")!;

describe("thread cache helpers", () => {
  it("patchLabelIds moves to Trash and Spam out of the other locations", () => {
    expect(patchLabelIds(["INBOX", "l_1"], ["TRASH"], [])).toEqual(["l_1", "TRASH"]);
    expect(patchLabelIds(["INBOX"], [], ["INBOX"])).toEqual([]);
    expect(patchLabelIds(["INBOX"], ["STARRED"], [])).toEqual(["INBOX", "STARRED"]);
  });

  it("archiving removes the row from the Inbox list, keeps it in all mail, counts down", () => {
    const qc = setup();
    applyOptimistic(qc, "acc_1", ["t_1"], [], ["INBOX"]);
    expect(rows(qc, "INBOX")).toEqual([]);
    expect(rows(qc).map((t) => t.labelIds)).toEqual([[]]);
    expect(inbox(qc).threadsTotal).toBe(339);
  });

  it("a snapshot restores lists and counters", () => {
    const qc = setup();
    const snap = takeSnapshot(qc, "acc_1", ["t_1"]);
    removeFromLists(qc, "acc_1", ["t_1"]);
    expect(rows(qc)).toEqual([]);
    restoreSnapshot(qc, snap);
    expect(rows(qc, "INBOX")).toHaveLength(1);
  });

  it("server threads overwrite the cached rows", () => {
    const qc = setup();
    mergeServerThreads(qc, "acc_1", [thread({ id: "t_1", subject: "Nowy", labelIds: ["INBOX"] })]);
    expect(rows(qc, "INBOX")[0]?.subject).toBe("Nowy");
  });

  it("locationLabelIds lists Inbox, Spam, Trash and the server folders", () => {
    expect(locationLabelIds(setup(), "acc_1")).toEqual(["INBOX", "SPAM", "TRASH", "l_9"]);
  });
});
