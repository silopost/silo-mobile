import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { call } from "../../api/errors";
import { keys } from "../../api/keys";
import { syncStatusQuery } from "../../api/queries/syncStatus";
import type { SyncStatus } from "../../api/types";
import { t } from "../../lib/i18n";
import { useConnection } from "../../state/connection";
import { toast } from "../../state/toasts";
import { useActiveAccount } from "../account";

/**
 * How often the status is polled while the account is not live (initial sync, backoff, failed
 * password) and the event stream is not either: account.status and account.sync_progress events
 * update it while SSE is up, so it is only polled while polling /events/poll or offline.
 */
export const SYNC_POLL_MS = 15_000;

/** Sync status of the route's account (GET /accounts/{id}/sync-status). */
export function useSyncStatus(): SyncStatus | undefined {
  const account = useActiveAccount();
  const streamed = useConnection((s) => s.state === "live" || s.state === "connecting");
  return useQuery({
    ...syncStatusQuery(account?.id ?? ""),
    enabled: !!account,
    refetchInterval: (q) => {
      const state = q.state.data?.state;
      return !streamed && state && state !== "live" ? SYNC_POLL_MS : false;
    },
  }).data;
}

/** "Ponów teraz": an incremental resync of the route's account (POST /accounts/{id}/resync). */
export function useResync() {
  const account = useActiveAccount();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      call(
        api().POST("/accounts/{id}/resync", {
          params: { path: { id: account!.id } },
          body: { mode: "incremental" },
        }),
      ),
    onSuccess: () => {
      if (!account) return;
      void qc.invalidateQueries({ queryKey: keys.syncStatus(account.id) });
      void qc.invalidateQueries({ queryKey: keys.threadsAll(account.id) });
      void qc.invalidateQueries({ queryKey: keys.labels(account.id) });
    },
    onError: () => toast(t.genericError),
  });
}

/** Initial sync progress in percent, or null while the totals are unknown (port of silo-web). */
export function progressPercent(s: SyncStatus): number | null {
  const { messagesDone, messagesTotal } = s.initialSync;
  if (!messagesTotal) return null;
  return Math.min(100, Math.floor((messagesDone / messagesTotal) * 100));
}

/** Whether the account is still in its first synchronisation (port of silo-web). */
export function isInitialSync(s: SyncStatus): boolean {
  return s.state === "initial_sync" || (!s.initialSyncDoneAt && s.initialSync.phase !== "done");
}
