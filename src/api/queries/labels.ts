import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";
import type { components } from "../schema";

export type Label = components["schemas"]["Label"];

/** GET /labels of one account: system, user and folder labels with their counters (plan 5.1). */
export const labelsQuery = (accountId: string) =>
  queryOptions({
    queryKey: keys.labels(accountId),
    queryFn: ({ signal }) =>
      call(api().GET("/labels", { params: { query: { accountId } }, signal })),
    staleTime: 30_000,
  });

const empty: Label[] = [];

/** Labels of an account; empty until loaded or without an account. */
export function useLabels(accountId: string | undefined): Label[] {
  return useQuery({ ...labelsQuery(accountId ?? ""), enabled: !!accountId }).data?.labels ?? empty;
}
