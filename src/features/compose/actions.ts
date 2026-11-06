import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { createDraft as postDraft } from "../../api/drafts";
import { keys } from "../../api/keys";
import type { CreateDraftBody, Draft, Message } from "../../api/types";
import { t } from "../../lib/i18n";
import { toast } from "../../state/toasts";
import { composeHref, openLoaded } from "./session";

export { composeHref };

export type DraftMode = NonNullable<CreateDraftBody["mode"]>;

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
    const draft: Draft = await postDraft(body);
    // Compose opens without a GET; the draft is deleted if left without an edit (as in Gmail).
    openLoaded(qc, draft, { created: true });
    void qc.invalidateQueries({ queryKey: keys.threadsAll(draft.accountId) });
    void qc.invalidateQueries({ queryKey: keys.thread(draft.threadId) });
    router.push(composeHref(draft.id));
    // Server 0.4.0: what the prefill could not carry over (a forward without some attachments,
    // a quote made of the snippet).
    const warnings = (draft.warnings ?? []).map((w) => t.draftWarnings[w]).filter(Boolean);
    if (warnings.length > 0) toast(warnings.join(" "));
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
