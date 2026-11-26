import { INBOX_SLUG } from "../../lib/labels";

/** `data` of a new-mail push (version 1): `{v: 1, type: "mail", accountId, threadId, count}`. */
export type MailPush = { accountId: string; threadId: string | null; count: number };

/** The mail push in a notification's data; null for another type or version, or a bad payload. */
export function parseMailPush(data: unknown): MailPush | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.v !== 1 || d.type !== "mail") return null;
  if (typeof d.accountId !== "string" || !d.accountId) return null;
  const count = typeof d.count === "number" && d.count >= 1 ? d.count : 1;
  const threadId = typeof d.threadId === "string" && d.threadId ? d.threadId : null;
  return { accountId: d.accountId, threadId, count };
}

/**
 * Where a tap on a mail push leads, as the drawer and the thread list address it
 * (/u/<Account.position>/inbox[/<threadId>]): one message opens its thread, a burst (count > 1,
 * possibly several threads) the Inbox of the account. Null when the user no longer has the
 * account: the app then opens as usual.
 */
export function mailPushHref(
  push: MailPush,
  accounts: readonly { id: string; position: number }[],
): string | null {
  const account = accounts.find((a) => a.id === push.accountId);
  if (!account) return null;
  const inbox = `/u/${account.position}/${INBOX_SLUG}`;
  return push.count === 1 && push.threadId
    ? `${inbox}/${encodeURIComponent(push.threadId)}`
    : inbox;
}
