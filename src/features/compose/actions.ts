import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { api } from "../../api/client";
import { call } from "../../api/errors";
import { keys } from "../../api/keys";
import type { CreateDraftBody, Draft, Message } from "../../api/types";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";

export type DraftMode = NonNullable<CreateDraftBody["mode"]>;

/** Path of the compose screen for a draft. */
export const composeHref = (draftId: string) => `/compose?draftId=${encodeURIComponent(draftId)}`;

let creating = false;

/**
 * POST /drafts and the compose screen for the new draft (port of silo-web's openReply). The
 * server prefills recipients, subject and quote of a reply or forward (plan 2.6). A second tap
 * while the first draft is being created does nothing.
 */
export async function createDraft(qc: QueryClient, body: CreateDraftBody): Promise<void> {
  if (creating) return;
  creating = true;
  try {
    const draft: Draft = await call(api().POST("/drafts", { body }));
    void qc.invalidateQueries({ queryKey: keys.threadsAll(draft.accountId) });
    void qc.invalidateQueries({ queryKey: keys.thread(draft.threadId) });
    router.push(composeHref(draft.id));
  } catch {
    toast(t.genericError);
  } finally {
    creating = false;
  }
}

/** Reply, reply all or forward a message. */
export const openReply = (qc: QueryClient, messageId: string, mode: DraftMode) =>
  createDraft(qc, { replyToMessageId: messageId, mode });

/** Replies go to the last message that is not a draft or a message waiting to be sent. */
export function replyTarget(messages: Message[]): Message | undefined {
  return messages.findLast((m) => {
    const ls = m.labelIds ?? [];
    return !ls.includes("DRAFT") && !ls.includes("SCHEDULED");
  });
}
