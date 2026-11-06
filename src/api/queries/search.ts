import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";

/**
 * GET /search/suggest: recent queries, contacts, labels and operators, all computed by the server
 * (plan 2.6, 3.12). An empty `q` answers the five most recent queries ("Ostatnie wyszukiwania").
 */
export const searchSuggestQuery = (accountId: string, q: string) =>
  queryOptions({
    queryKey: keys.searchSuggest(accountId, q),
    queryFn: ({ signal }) =>
      call(api().GET("/search/suggest", { params: { query: { accountId, q } }, signal })),
    staleTime: 10_000,
    // The previous suggestions stay while the next ones load (no flicker while typing).
    placeholderData: keepPreviousData,
  });

/** DELETE /search/history: one query (its exact text) or, without it, the whole history. */
export const deleteSearchHistory = (accountId: string, query?: string): Promise<unknown> =>
  call(api().DELETE("/search/history", { params: { query: { accountId, query } } }));
