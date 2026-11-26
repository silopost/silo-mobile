import { api } from "./client";
import { call } from "./errors";
import type { MessageSummary } from "./types";

/**
 * GET /messages?ids=: sender, subject and snippet of messages, newest first (server 0.11.0, what a
 * new-mail notification shows). Ids the server does not know (any more) are left out.
 */
export async function getMessageSummaries(
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<MessageSummary[]> {
  const res = await call(
    api().GET("/messages", {
      params: { query: { ids: [...ids] } },
      // The contract says explode: false (ids=m_1,m_2); openapi-fetch repeats the name by default.
      querySerializer: { array: { style: "form", explode: false } },
      signal,
    }),
  );
  return res.messages ?? [];
}
