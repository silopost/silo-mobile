import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";
import type { Filter, FilterApplyResult, FilterBody } from "../types";

/** GET /filters of an account, in the order the server evaluates them (position). */
export const filtersQuery = (accountId: string) =>
  queryOptions({
    queryKey: keys.filters(accountId),
    queryFn: ({ signal }) =>
      call(api().GET("/filters", { params: { query: { accountId } }, signal })),
    staleTime: 30_000,
  });

const empty: Filter[] = [];

/** The filters of an account sorted by position; empty until loaded. */
export function useFilters(accountId: string | undefined) {
  const q = useQuery({ ...filtersQuery(accountId ?? ""), enabled: !!accountId });
  const filters = q.data?.filters;
  return {
    ...q,
    filters: filters ? [...filters].sort((a, b) => a.position - b.position) : empty,
  };
}

/** The whole filter as PUT /filters/{id} wants it (a full replacement), a port of silo-web's. */
export const filterBody = (f: Filter, patch: Partial<FilterBody> = {}): FilterBody => ({
  accountId: f.accountId,
  name: f.name,
  criteria: f.criteria,
  enabled: f.enabled,
  position: f.position,
  actions: {
    archive: f.actions.archive,
    markRead: f.actions.markRead,
    star: f.actions.star,
    important: f.actions.important,
    trash: f.actions.trash,
    addLabelIds: f.actions.addLabelIds ?? [],
    ...(f.actions.forwardTo ? { forwardTo: f.actions.forwardTo } : {}),
  },
  ...patch,
});

export const createFilter = (body: FilterBody): Promise<Filter> =>
  call(api().POST("/filters", { body }));

export const replaceFilter = (id: string, body: FilterBody): Promise<Filter> =>
  call(api().PUT("/filters/{id}", { params: { path: { id } }, body }));

export const deleteFilter = (id: string): Promise<unknown> =>
  call(api().DELETE("/filters/{id}", { params: { path: { id } } }));

/** Filters applied from this app: filter.applied of one of them shows the result. */
export const appliedHere = new Set<string>();

/**
 * POST /filters/{id}/apply: the server queues the job and answers an estimate; the event
 * filter.applied tells when it is done.
 */
export async function applyFilter(id: string): Promise<FilterApplyResult> {
  const res = await call(api().POST("/filters/{id}/apply", { params: { path: { id } } }));
  appliedHere.add(id);
  return res;
}
