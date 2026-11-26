import { INBOX_SLUG } from "../../lib/labels";

/** The most messages a push names (silo-server push.MaxNotifiedMessages). */
export const MAX_NOTIFIED_MESSAGES = 5;

/**
 * `data` of a new-mail push (version 1): `{v: 1, type: "mail", accountId, threadId, count}`, and
 * from server 0.11.0 `messageIds` (newest first) when the burst has at most five messages.
 * `messageIds` is null when the push names no messages (an older server, or a larger burst).
 */
export type MailPush = {
  accountId: string;
  threadId: string | null;
  count: number;
  messageIds: string[] | null;
};

/** The ids of `messageIds` when they are a usable list of the whole burst; null otherwise. */
function messageIdsOf(value: unknown, count: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_NOTIFIED_MESSAGES) {
    return null;
  }
  if (!value.every((id) => typeof id === "string" && /^m_[0-9a-z]+$/.test(id))) return null;
  return value.length === count ? (value as string[]) : null;
}

/** The mail push in a notification's data; null for another type or version, or a bad payload. */
export function parseMailPush(data: unknown): MailPush | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.v !== 1 || d.type !== "mail") return null;
  if (typeof d.accountId !== "string" || !d.accountId) return null;
  const count = typeof d.count === "number" && d.count >= 1 ? d.count : 1;
  const threadId = typeof d.threadId === "string" && d.threadId ? d.threadId : null;
  return { accountId: d.accountId, threadId, count, messageIds: messageIdsOf(d.messageIds, count) };
}

/**
 * Where a tap on a mail push leads, as the drawer and the thread list address it
 * (/u/<Account.position>/inbox[/<threadId>]): one message opens its thread, a burst (count > 1,
 * possibly several threads) the Inbox of the account. Null when the user no longer has the
 * account: the app then opens as usual.
 */
export function mailPushHref(
  push: Pick<MailPush, "accountId" | "threadId" | "count">,
  accounts: readonly { id: string; position: number }[],
): string | null {
  const account = accounts.find((a) => a.id === push.accountId);
  if (!account) return null;
  const inbox = `/u/${account.position}/${INBOX_SLUG}`;
  return push.count === 1 && push.threadId
    ? `${inbox}/${encodeURIComponent(push.threadId)}`
    : inbox;
}
