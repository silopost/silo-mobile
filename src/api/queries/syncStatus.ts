import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";

/** GET /accounts/{id}/sync-status: connection state, initial sync progress, pending operations. */
export const syncStatusQuery = (accountId: string) =>
  queryOptions({
    queryKey: keys.syncStatus(accountId),
    queryFn: ({ signal }) =>
      call(
        api().GET("/accounts/{id}/sync-status", { params: { path: { id: accountId } }, signal }),
      ),
    staleTime: 30_000,
  });
