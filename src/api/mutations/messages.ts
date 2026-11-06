import type { QueryClient } from "@tanstack/react-query";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";
import type { ThreadDetail } from "../types";
import { mergeServerThreads, patchLabelIds } from "./cache";

export type MessageModifyInput = {
  accountId: string;
  threadId: string;
  /** m_ ids of the thread. */
  ids: string[];
  add?: string[];
  remove?: string[];
};

/** Thread labels that follow its messages: a thread is starred / unread when any message is. */
const DERIVED = ["STARRED", "UNREAD"];

function patchDetail(d: ThreadDetail, input: MessageModifyInput): ThreadDetail {
  const set = new Set(input.ids);
  const messages = (d.messages ?? []).map((m) =>
    set.has(m.id)
      ? { ...m, labelIds: patchLabelIds(m.labelIds ?? [], input.add ?? [], input.remove ?? []) }
      : m,
  );
  let labelIds = (d.labelIds ?? []).filter((l) => !DERIVED.includes(l));
  for (const l of DERIVED) {
    if (messages.some((m) => (m.labelIds ?? []).includes(l))) labelIds = [...labelIds, l];
  }
  return { ...d, messages, labelIds };
}

/**
 * POST /messages/modify for messages of an open thread (the star of a message, "unread from
 * here"): optimistic on the open thread, then the server's threads over the lists. Per-message
 * changes have no snackbar and no "Cofnij", as in the Gmail app.
 */
export async function modifyMessages(qc: QueryClient, input: MessageModifyInput): Promise<void> {
  const key = keys.thread(input.threadId);
  const before = qc.getQueryData<ThreadDetail>(key);
  if (before) qc.setQueryData<ThreadDetail>(key, patchDetail(before, input));
  try {
    const res = await call(
      api().POST("/messages/modify", {
        body: { ids: input.ids, addLabelIds: input.add ?? [], removeLabelIds: input.remove ?? [] },
      }),
    );
    mergeServerThreads(qc, input.accountId, res.threads ?? []);
  } catch {
    if (before) qc.setQueryData(key, before);
    toast(t.genericError);
  } finally {
    void qc.invalidateQueries({ queryKey: keys.labels(input.accountId) });
  }
}
