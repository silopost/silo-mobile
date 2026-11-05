import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys, type ListFilter } from "../keys";

export const PAGE_SIZE = 50;

/** GET /threads as an infinite query over the opaque keyset cursor (plan 4.7, 5.2). */
export const threadsQuery = (accountId: string, filter: ListFilter) =>
  infiniteQueryOptions({
    queryKey: keys.threads(accountId, filter),
    queryFn: ({ pageParam, signal }) =>
      call(
        api().GET("/threads", {
          params: {
            query: {
              accountId,
              labelId: filter.labelId,
              q: filter.q,
              cursor: pageParam,
              limit: PAGE_SIZE,
            },
          },
          signal,
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
    // A long list holds many pages; comparing all of them deeply on every new page costs more
    // than it saves (rows are memoised per thread, only the visible ones re-render).
    structuralSharing: false,
  });

/** GET /threads/{id}: a thread with its messages (the thread screen of slice 6). */
export const threadQuery = (id: string) =>
  queryOptions({
    queryKey: keys.thread(id),
    queryFn: ({ signal }) => call(api().GET("/threads/{id}", { params: { path: { id } }, signal })),
    staleTime: 30_000,
  });
