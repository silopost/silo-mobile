import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { t } from "../lib/i18n";
import { useAuth } from "../state/auth";
import { useCompose } from "../state/compose";
import { setConnection, useConnection } from "../state/connection";
import { show } from "../state/toasts";
import { forgetSession } from "./cache";
import { api, apiBaseUrl, clientId } from "./client";
import { call, isApiError } from "./errors";
import { keys } from "./keys";
import { updateLists, type LabelsData } from "./mutations/cache";
import { handleOperationFailed, isThreadOpRunning } from "./mutations/threads";
import { fetchEventSource, type SseHandlers, type SseSource } from "./sse";
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
  "settings.updated",
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
      // Server 0.4.0: the wake time of a snoozed thread (null once it is awake or unsnoozed).
      if ("snoozedUntil" in data) patch.snoozedUntil = str(data.snoozedUntil) ?? null;
      let seen = false;
      let moved = false;
      updateLists(qc, accountId, (row) => {
        if (row.id !== id) return row;
        seen = true;
        moved ||= patch.lastMessageAt !== undefined && patch.lastMessageAt !== row.lastMessageAt;
        return { ...row, ...patch };
      });
      qc.setQueryData<ThreadDetail>(keys.thread(id), (d) =>
        d
          ? {
              ...d,
              labelIds,
              ...(patch.snoozedUntil !== undefined ? { snoozedUntil: patch.snoozedUntil } : {}),
            }
          : d,
      );
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
    case "settings.updated":
      // Another device or session changed the settings: GET /settings again (our own PATCH
      // answer is already in the cache).
      if (!own) void qc.invalidateQueries({ queryKey: keys.settings });
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
      // The server made the message a draft again (plan 3.9 step 6): compose shows why in a red
      // bar, and reloads the draft (lastSend) when it opens it.
      useCompose.getState().setFailure(draftId, {
        error: str(data.error),
        failedRecipients: strings(data.failedRecipients),
      });
      void qc.invalidateQueries({ queryKey: keys.draft(draftId) });
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

export const eventsConfig = {
  /** Path of the stream under /api/v1. */
  path: "/events",
  /** Failed SSE attempts in a row before switching to polling (plan 3.14). */
  maxSseFailures: 3,
  /** Delay before the n-th reconnect: min · 2^(n-1), at most max. */
  backoffMinMs: 1000,
  backoffMaxMs: 30_000,
  /** Polling interval of the fallback: plan 3.14's 15 s (silo-web polls every 5 s). */
  pollIntervalMs: 15_000,
  /** While polling, how often to try SSE again. */
  sseRetryMs: 5 * 60_000,
  /** Opens one SSE attempt; null when the platform has no way to stream (→ polling). */
  createEventSource: (
    url: string,
    headers: Record<string, string>,
    handlers: SseHandlers,
  ): SseSource | null => fetchEventSource(url, headers, handlers),
};

/**
 * Sequence number of the last event received, kept while the app goes to the background so the
 * stream resumes from it (Last-Event-ID); forgotten on sign-out.
 */
let lastId: number | null = null;

export const eventPosition = () => lastId;
export function resetEventPosition(): void {
  lastId = null;
}

/**
 * Connects the app to the event stream of the signed-in user: SSE over fetch with
 * Authorization: Bearer and Last-Event-ID headers, reconnecting with backoff; after
 * maxSseFailures failures in a row GET /events/poll?after= every pollIntervalMs, trying SSE again
 * every sseRetryMs (plan 3.14, 5.4). A 401 stops it and signs out. Returns the disconnect function.
 */
export function connectEvents(qc: QueryClient): () => void {
  let stopped = false;
  let attempt = 0;
  let source: SseSource | null = null;
  let failures = 0;
  let polling = false;
  let ownId: string | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let sseRetryTimer: ReturnType<typeof setTimeout> | undefined;

  const handle = (type: string, id: string | number | undefined, raw: unknown) => {
    const n = Number(id);
    if (id !== undefined && id !== "" && Number.isFinite(n)) lastId = n;
    let data: EventData = {};
    if (typeof raw === "string") {
      try {
        data = JSON.parse(raw) as EventData;
      } catch {
        return;
      }
    } else if (raw && typeof raw === "object") data = raw as EventData;
    applyEvent(qc, type, data, ownId);
  };

  const stop = () => {
    stopped = true;
    attempt += 1;
    source?.close();
    source = null;
    polling = false;
    clearTimeout(reconnectTimer);
    clearTimeout(pollTimer);
    clearTimeout(sseRetryTimer);
  };

  const stopPolling = () => {
    polling = false;
    clearTimeout(pollTimer);
    clearTimeout(sseRetryTimer);
  };

  // Tells "Silo unreachable" (offline banner) apart from "the stream alone failed".
  const probe = async () => {
    try {
      await call(api().GET("/meta"));
      // Reachable again: no banner while the stream reconnects.
      if (!stopped && useConnection.getState().state === "offline") setConnection("connecting");
    } catch {
      if (!stopped) setConnection("offline");
    }
  };

  const openSse = async () => {
    const { serverUrl, token } = useAuth.getState();
    if (stopped || !serverUrl || !token) return;
    ownId ??= await clientId();
    if (stopped) return;
    const my = ++attempt;
    const current = () => my === attempt && !stopped;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "X-Silo-Client": ownId,
    };
    if (lastId !== null) headers["Last-Event-ID"] = String(lastId);
    const es = eventsConfig.createEventSource(apiBaseUrl(serverUrl) + eventsConfig.path, headers, {
      onOpen: () => {
        if (!current()) return;
        failures = 0;
        stopPolling();
        setConnection("live");
      },
      onEvent: (m) => {
        if (current()) handle(m.type, m.id, m.data);
      },
      onError: ({ status }) => {
        if (!current()) return;
        source = null;
        if (status === 401) {
          // The session ended: no retry loop; sign out as the API client does on a 401 (unless
          // the token changed meanwhile).
          stop();
          if (useAuth.getState().token === token) void forgetSession();
          return;
        }
        failures += 1;
        if (failures >= eventsConfig.maxSseFailures) return startPolling();
        if (!polling) void probe();
        const delay = Math.min(
          eventsConfig.backoffMaxMs,
          eventsConfig.backoffMinMs * 2 ** (failures - 1),
        );
        reconnectTimer = setTimeout(() => void openSse(), delay);
      },
    });
    if (!es) return startPolling();
    if (current()) source = es;
    else es.close();
  };

  const poll = async () => {
    if (stopped || !polling) return;
    try {
      const res = await call(
        api().GET("/events/poll", { params: { query: { after: lastId ?? 0 } } }),
      );
      if (stopped) return;
      if (lastId === null) {
        // First poll without a position: skip the retained backlog, refetch the current state.
        lastId = res.nextAfter;
        void qc.invalidateQueries();
      } else {
        for (const ev of res.events ?? []) handle(ev.type, ev.id, ev.data);
        lastId = res.nextAfter;
      }
      if (polling) setConnection("polling");
    } catch (err) {
      if (stopped) return;
      // The API client signs out on a 401; the app layout then disconnects.
      if (isApiError(err, 401)) return stop();
      setConnection("offline");
    }
    if (!stopped && polling) pollTimer = setTimeout(() => void poll(), eventsConfig.pollIntervalMs);
  };

  const startPolling = () => {
    if (stopped) return;
    if (!polling) {
      polling = true;
      void poll();
    }
    clearTimeout(sseRetryTimer);
    sseRetryTimer = setTimeout(() => {
      // One more failure returns to polling (which keeps running meanwhile).
      failures = eventsConfig.maxSseFailures - 1;
      void openSse();
    }, eventsConfig.sseRetryMs);
  };

  setConnection("connecting");
  void openSse();
  return stop;
}
