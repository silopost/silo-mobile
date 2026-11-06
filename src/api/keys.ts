/** Filter of a thread list: `labelId` undefined is all mail ("Wszystkie"), `q` a search. */
export type ListFilter = { labelId?: string; q?: string };

/** Query keys (plan 6.4), the same shapes as silo-web's. */
export const keys = {
  session: ["session"] as const,
  /** Per instance: the sign-in screen asks the address being typed. */
  meta: (serverUrl: string) => ["meta", serverUrl] as const,
  sessions: ["sessions"] as const,
  labels: (accountId: string) => ["labels", accountId] as const,
  /** Prefix of every thread list of an account (invalidated after a resync). */
  threadsAll: (accountId: string) => ["threads", accountId] as const,
  threads: (accountId: string, filter: ListFilter) => ["threads", accountId, filter] as const,
  thread: (id: string) => ["thread", id] as const,
  /** Sanitised HTML of a message (immutable). */
  messageHtml: (id: string) => ["messageHtml", id] as const,
  /** The inline (cid:) images of a message as data URIs. */
  messageInline: (id: string) => ["messageInline", id] as const,
  syncStatus: (accountId: string) => ["syncStatus", accountId] as const,
  /** A draft as the compose screen last loaded or saved it. */
  draft: (id: string) => ["draft", id] as const,
  /** Address suggestions for the text typed in a recipient field. */
  contacts: (q: string) => ["contacts", q] as const,
};
