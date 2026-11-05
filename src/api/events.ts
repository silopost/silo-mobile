import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { t } from "../lib/i18n";
import { useCompose } from "../state/compose";
import { show } from "../state/toasts";
import { keys } from "./keys";
import { updateLists, type LabelsData } from "./mutations/cache";
import { handleOperationFailed, isThreadOpRunning } from "./mutations/threads";
import type { SyncStatus, Thread, ThreadDetail } from "./types";

/**
 * Payload of an event. The contract declares the event types only in prose and `PolledEvent.data`
 * as a free object, so the fields are read with guards (see docs/NOTES-FOR-SILO.md).
 */
export type EventData = Record<string, unknown>;

/** Event types the app listens to (plan 5.4); the same list as silo-web's. */
export const EVENT_TYPES = [
  "message.new",
  "thread.updated",
  "thread.deleted",
  "thread.merged",
  "label.counts",
  "label.changed",
  "draft.updated",
  "operation.failed",
  "outbound.status",
  "account.status",
  "account.sync_progress",
  "account.error",
  "resync",
] as const;

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Maps one event to cache updates and invalidations (plan 5.4), a port of silo-web's. `ownClientId`
 * is this installation's X-Silo-Client: events with that `origin` were caused by this app.
 */
export function applyEvent(
  qc: QueryClient,
  type: string,
  data: EventData,
  ownClientId?: string,
): void {
  const accountId = str(data.accountId);
  const own = ownClientId !== undefined && data.origin === ownClientId;
  switch (type) {
    case "message.new":
      // Hook for a local notification once the app shows them; system push is phase 6.
      if (accountId) void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
      return;
    case "thread.merged": {
      if (accountId) void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
      const into = str(data.intoId);
      if (into) void qc.invalidateQueries({ queryKey: keys.thread(into) });
      return;
    }
    case "thread.updated": {
      const id = str(data.threadId);
      if (!id || !accountId) return;
      // Our own change while an operation is in flight: its answer updates the cache, the event
      // would overwrite the optimistic state (plan 5.4).
      if (own && isThreadOpRunning(qc)) return;
      const labelIds = strings(data.labelIds);
      const patch: Partial<Thread> = {
        labelIds,
        unreadCount: Number(data.unreadCount ?? 0),
        pendingSync: Boolean(data.pendingSync),
      };
      if (typeof data.messageCount === "number") patch.messageCount = data.messageCount;
      const last = str(data.lastMessageAt);
      if (last) patch.lastMessageAt = last;
      if (typeof data.snippet === "string") patch.snippet = data.snippet;
      let seen = false;
      let moved = false;
      updateLists(qc, accountId, (row) => {
        if (row.id !== id) return row;
        seen = true;
        moved ||= patch.lastMessageAt !== undefined && patch.lastMessageAt !== row.lastMessageAt;
        return { ...row, ...patch };
      });
      qc.setQueryData<ThreadDetail>(keys.thread(id), (d) => (d ? { ...d, labelIds } : d));
      // A thread new to a list (or moved within it) needs the server's row and order.
      if (!seen || moved) void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
      if (patch.messageCount !== undefined)
        void qc.invalidateQueries({ queryKey: keys.thread(id) });
      return;
    }
    case "thread.deleted": {
      const id = str(data.threadId);
      if (!id) return;
      if (accountId) updateLists(qc, accountId, (row) => (row.id === id ? null : row));
      qc.removeQueries({ queryKey: keys.thread(id) });
      return;
    }
    case "label.counts": {
      if (!accountId || !Array.isArray(data.labels)) return;
      const counts = new Map<string, { threadsUnread: number; threadsTotal: number }>();
      for (const l of data.labels as Record<string, unknown>[]) {
        const id = str(l?.id);
        if (id && typeof l.threadsUnread === "number" && typeof l.threadsTotal === "number")
          counts.set(id, { threadsUnread: l.threadsUnread, threadsTotal: l.threadsTotal });
      }
      qc.setQueryData<LabelsData>(keys.labels(accountId), (d) =>
        d?.labels
          ? {
              ...d,
              labels: d.labels.map((l) => {
                const c = counts.get(l.id);
                return c ? { ...l, ...c } : l;
              }),
            }
          : d,
      );
      return;
    }
    case "label.changed":
      if (accountId) void qc.invalidateQueries({ queryKey: keys.labels(accountId) });
      return;
    case "operation.failed":
      handleOperationFailed(qc, {
        operationId: str(data.operationId),
        accountId,
        kind: str(data.kind),
        threadIds: strings(data.threadIds),
      });
      return;
    case "draft.updated": {
      // Saved by another device or program: the compose screen offers "Wczytaj / Nadpisz".
      const draftId = str(data.draftId);
      if (draftId && !own && typeof data.version === "number")
        useCompose.getState().setRemoteVersion(draftId, data.version);
      return;
    }
    case "outbound.status": {
      const draftId = str(data.draftId);
      if (accountId) void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
      if (data.status !== "failed" || !draftId) return;
      // The server made the message a draft again (plan 3.9 step 6); compose opens it (slice 7).
      show({
        message: t.sendFailedOpen,
        action: {
          label: t.open,
          onPress: () => router.push({ pathname: "/compose", params: { draftId } }),
        },
      });
      return;
    }
    case "account.sync_progress":
      if (!accountId) return;
      qc.setQueryData<SyncStatus>(keys.syncStatus(accountId), (s) => {
        if (!s) return s;
        // Only the fields of the progress (the payload also has accountId, origin, ...).
        const initialSync = { ...s.initialSync };
        for (const k of Object.keys(initialSync) as (keyof typeof initialSync)[]) {
          if (k in data) (initialSync as Record<string, unknown>)[k] = data[k];
        }
        return { ...s, initialSync };
      });
      return;
    case "account.status":
    case "account.error":
      if (accountId) void qc.invalidateQueries({ queryKey: keys.syncStatus(accountId) });
      void qc.invalidateQueries({ queryKey: keys.session });
      return;
    case "resync":
      void qc.invalidateQueries();
      return;
  }
}
