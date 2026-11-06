import type { QueryClient } from "@tanstack/react-query";
import { formatWhen } from "../../lib/format";
import { t } from "../../lib/i18n";
import { hideToast, show, toast } from "../../state/toasts";
import { api } from "../client";
import { call, isApiError } from "../errors";
import { keys } from "../keys";
import type { OperationResult, SnoozeResult, Thread } from "../types";
import {
  applyOptimistic,
  locationLabelIds,
  mergeServerThreads,
  patchSnoozedUntil,
  removeFromLists,
  restoreSnapshot,
  takeSnapshot,
  type LabelsData,
  type Snapshot,
} from "./cache";

/** Actions on threads, named as silo-web's, plus "Przenieś do" of the Gmail app. */
export type ThreadAction =
  | "archive"
  | "inbox"
  | "trash"
  | "untrash"
  | "spam"
  | "notSpam"
  | "read"
  | "unread"
  | "star"
  | "unstar"
  | "labels"
  | "moveTo"
  | "deleteForever"
  | "snooze"
  | "unsnooze";

/** Targets of "Przenieś do" that are not a label id: archive (leave the Inbox). */
export const ARCHIVE = "ARCHIVE";

export type Spec = {
  /**
   * Endpoint: modify with add/remove, one of the batch endpoints, or the per-thread snooze
   * endpoints (POST / DELETE /threads/{id}/snooze, one request per thread: there is no batch).
   */
  endpoint: "modify" | "trash" | "untrash" | "delete" | "snooze" | "unsnooze";
  /** Label changes sent to modify. */
  add: string[];
  remove: string[];
  /**
   * Extra labels dropped by the optimistic change only: a move to a location leaves the other
   * locations on the server by itself (plan 4.4), the client just mirrors it.
   */
  leave?: string[];
  /** Snackbar text with "Cofnij"; silent actions (star) have none. */
  message?: (n: number) => string;
  /** Snooze: the wake time sent (and shown in the row at once); unsnooze: null. */
  snoozedUntil?: string | null;
  /** Snackbar text of a refused request by its code; "Nie udało się" otherwise. */
  error?: (err: unknown) => string;
};

export type ThreadActionInput = {
  accountId: string;
  ids: string[];
  action: ThreadAction;
  /** For "labels": user labels to add / remove. */
  add?: string[];
  remove?: string[];
  /** For "moveTo": INBOX, SPAM, TRASH, ARCHIVE, a folder or a user label. */
  target?: string;
  /** For "snooze": the wake time (a preset's `until` or the picked date), RFC 3339. */
  until?: string;
  /** Label of the view the action was taken in: archive there leaves that label too. */
  viewLabelId?: string;
  /** No snackbar (e.g. marking read on open). */
  silent?: boolean;
  /** Called on "Cofnij", e.g. to go back to the thread that was archived from its view. */
  onUndo?: () => void;
};

const MUTATION_KEY = ["threads-op"] as const;

function cachedLabels(qc: QueryClient, accountId: string) {
  return qc.getQueryData<LabelsData>(keys.labels(accountId))?.labels ?? [];
}

/** A move to a location (Inbox, Spam, a folder): the others are left by the server. */
function moveSpec(
  qc: QueryClient,
  accountId: string,
  target: string,
  message: (n: number) => string,
): Spec {
  return {
    endpoint: "modify",
    add: [target],
    remove: [],
    leave: locationLabelIds(qc, accountId).filter((l) => l !== target),
    message,
  };
}

/**
 * Archive: leave the Inbox (plan 4.4 `-INBOX`). In a server folder archiving leaves that folder
 * (`-<folder>`); in a user label view it also takes the label off, as the Gmail app does, so the
 * row leaves the view the user swiped it in.
 */
function archiveSpec(qc: QueryClient, accountId: string, viewLabelId: string | undefined): Spec {
  const view = viewLabelId
    ? cachedLabels(qc, accountId).find((l) => l.id === viewLabelId)
    : undefined;
  const remove =
    view?.type === "folder" ? [view.id] : view?.type === "user" ? ["INBOX", view.id] : ["INBOX"];
  return { endpoint: "modify", add: [], remove, message: t.done.archive };
}

/** What an action sends and how it is shown (the mapping of plan 4.4 and silo-web). */
export function specFor(qc: QueryClient, input: ThreadActionInput): Spec {
  const { accountId } = input;
  switch (input.action) {
    case "archive":
      return archiveSpec(qc, accountId, input.viewLabelId);
    case "inbox":
      return moveSpec(qc, accountId, "INBOX", t.done.inbox);
    case "trash":
      return { endpoint: "trash", add: ["TRASH"], remove: [], message: t.done.trash };
    case "untrash":
      return { endpoint: "untrash", add: [], remove: ["TRASH"], message: t.done.untrash };
    case "spam":
      return moveSpec(qc, accountId, "SPAM", t.done.spam);
    case "notSpam":
      return { endpoint: "modify", add: [], remove: ["SPAM"], message: t.done.inbox };
    case "read":
      return { endpoint: "modify", add: [], remove: ["UNREAD"], message: t.done.read };
    case "unread":
      return { endpoint: "modify", add: ["UNREAD"], remove: [], message: t.done.unread };
    case "star":
      return { endpoint: "modify", add: ["STARRED"], remove: [] };
    case "unstar":
      return { endpoint: "modify", add: [], remove: ["STARRED"] };
    case "labels":
      return {
        endpoint: "modify",
        add: input.add ?? [],
        remove: input.remove ?? [],
        message: t.done.labels,
      };
    case "deleteForever":
      return { endpoint: "delete", add: [], remove: [], message: t.done.deleted };
    case "moveTo":
      return moveToSpec(qc, input);
    case "snooze": {
      const until = input.until;
      if (!until) throw new Error("snooze needs a time");
      // The thread leaves the Inbox for Odłożone (plan 3.10); the server moves it.
      return {
        endpoint: "snooze",
        add: ["SNOOZED"],
        remove: ["INBOX"],
        snoozedUntil: until,
        message: (n) => t.done.snooze(n, formatWhen(until)),
        error: snoozeError,
      };
    }
    case "unsnooze":
      return {
        endpoint: "unsnooze",
        add: ["INBOX"],
        remove: ["SNOOZED"],
        snoozedUntil: null,
        message: t.done.unsnooze,
        error: snoozeError,
      };
  }
}

/** Text of a refused snooze or unsnooze: 422 invalid_snooze, 409 not_in_inbox / not_snoozed. */
export function snoozeError(err: unknown): string {
  if (!isApiError(err)) return t.genericError;
  switch (err.code) {
    case "not_in_inbox":
      return t.snoozeNotInInbox;
    case "invalid_snooze":
      return t.snoozeInvalid;
    case "not_snoozed":
      return t.notSnoozed;
    default:
      return t.genericError;
  }
}

function moveToSpec(qc: QueryClient, input: ThreadActionInput): Spec {
  const { accountId, target } = input;
  if (!target) throw new Error("moveTo needs a target");
  if (target === "TRASH") return specFor(qc, { ...input, action: "trash" });
  if (target === ARCHIVE) return { ...archiveSpec(qc, accountId, input.viewLabelId) };
  const label = cachedLabels(qc, accountId).find((l) => l.id === target);
  const name = t.locations[target] ?? label?.name ?? target;
  const message = (n: number) => t.done.moved(n, name);
  // A user label is no location: moving there labels the thread and leaves the Inbox, as in
  // Gmail. Inbox, Spam and server folders are locations: the server leaves the old one itself.
  if (label?.type === "user") {
    return { endpoint: "modify", add: [target], remove: ["INBOX"], message };
  }
  return moveSpec(qc, accountId, target, message);
}

/** Operations of this app run, for operation.failed (plan 5.7): their pre-operation snapshot. */
const recentOps = new Map<string, { accountId: string; snapshot: Snapshot }>();
const MAX_RECENT = 50;

function remember(operationId: string, accountId: string, snapshot: Snapshot): void {
  recentOps.set(operationId, { accountId, snapshot });
  if (recentOps.size > MAX_RECENT) recentOps.delete(recentOps.keys().next().value!);
}

/** Mutations are serialised per thread so that fast archive → undo does not interleave (6.5). */
function scopeOf(ids: string[]): string {
  return ids.length === 1 ? `thread:${ids[0]}` : `threads:${[...ids].sort().join(",")}`;
}

/**
 * What a request answered, the same for the batch endpoints (one operation) and the per-thread
 * snooze endpoints (one operation per thread).
 */
type Outcome = {
  threads: Thread[];
  /** Operations to undo with "Cofnij" (none for delete forever and unsnooze). */
  operationIds: string[];
  /** The earliest end of their undo windows. */
  undoUntil: string | null;
  /** Some threads of a per-thread request were refused: the first error. */
  partialError?: unknown;
};

const fromOperation = (res: OperationResult): Outcome => ({
  threads: res.threads ?? [],
  operationIds: res.operationId ? [res.operationId] : [],
  undoUntil: res.undoUntil ?? null,
});

/**
 * One request per thread (snooze has no batch endpoint): the answers of those that succeeded;
 * rejected only when every thread was refused.
 */
async function perThread(
  ids: string[],
  one: (id: string) => Promise<SnoozeResult>,
): Promise<Outcome> {
  const results = await Promise.allSettled(ids.map(one));
  const done = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failed = results.flatMap((r) => (r.status === "rejected" ? [r.reason as unknown] : []));
  if (done.length === 0) throw failed[0];
  const ends = done.flatMap((r) => (r.undoUntil ? [r.undoUntil] : []));
  return {
    threads: done.map((r) => r.thread),
    operationIds: done.flatMap((r) => (r.operationId ? [r.operationId] : [])),
    undoUntil: ends.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null,
    ...(failed.length > 0 ? { partialError: failed[0] } : {}),
  };
}

async function request(spec: Spec, ids: string[]): Promise<Outcome> {
  switch (spec.endpoint) {
    case "trash":
      return fromOperation(await call(api().POST("/threads/trash", { body: { ids } })));
    case "untrash":
      return fromOperation(await call(api().POST("/threads/untrash", { body: { ids } })));
    case "delete":
      return fromOperation(await call(api().POST("/threads/delete", { body: { ids } })));
    case "modify":
      return fromOperation(
        await call(
          api().POST("/threads/modify", {
            body: { ids, addLabelIds: spec.add, removeLabelIds: spec.remove },
          }),
        ),
      );
    case "snooze": {
      const until = spec.snoozedUntil ?? "";
      return perThread(ids, (id) =>
        call(api().POST("/threads/{id}/snooze", { params: { path: { id } }, body: { until } })),
      );
    }
    case "unsnooze":
      return perThread(ids, (id) =>
        call(api().DELETE("/threads/{id}/snooze", { params: { path: { id } } })),
      );
  }
}

/** Refetches in the background once no other thread operation is in flight (plan 6.5 step 5). */
function settle(qc: QueryClient, accountId: string, ids: string[]): void {
  if (qc.isMutating({ mutationKey: MUTATION_KEY }) > 1) return;
  void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
  void qc.invalidateQueries({ queryKey: keys.labels(accountId) });
  for (const id of ids) void qc.invalidateQueries({ queryKey: keys.thread(id) });
}

/**
 * Runs a thread action with an optimistic update (plan 6.5): snapshot and local change, the
 * request, the server state written over the cache, a snackbar with "Cofnij" until the server's
 * undoUntil, rollback on error.
 */
export function runThreadAction(qc: QueryClient, input: ThreadActionInput): Promise<void> {
  const { accountId, ids } = input;
  const spec = specFor(qc, input);

  const optimistic = () => {
    const snapshot = takeSnapshot(qc, accountId, ids);
    if (spec.endpoint === "delete") removeFromLists(qc, accountId, ids);
    else applyOptimistic(qc, accountId, ids, spec.add, [...spec.remove, ...(spec.leave ?? [])]);
    if (spec.snoozedUntil !== undefined) patchSnoozedUntil(qc, accountId, ids, spec.snoozedUntil);
    return snapshot;
  };
  // With no list refetch in flight the local change is made right here, in the gesture that
  // started the action, so that the row leaves in the next frame. A refetch in flight is
  // cancelled first: its answer would otherwise overwrite the change.
  const early = qc.isFetching({ queryKey: keys.threadsAll(accountId) }) > 0 ? null : optimistic();

  const mutation = qc.getMutationCache().build(qc, {
    mutationKey: MUTATION_KEY,
    scope: { id: scopeOf(ids) },
    mutationFn: () => request(spec, ids),
    onMutate: async () => {
      if (early) return early;
      await qc.cancelQueries({ queryKey: keys.threadsAll(accountId) });
      return optimistic();
    },
    onSuccess: (res: Outcome, _vars, snapshot) => {
      mergeServerThreads(qc, accountId, res.threads);
      const opIds = res.operationIds;
      if (snapshot) for (const opId of opIds) remember(opId, accountId, snapshot);
      if (input.silent || !spec.message) return;
      // A per-thread request names the threads it changed and why the others were refused.
      const partial = "partialError" in res;
      const text = spec.message(partial ? res.threads.length : ids.length);
      const message = partial
        ? `${text}. ${(spec.error ?? (() => t.genericError))(res.partialError)}`
        : text;
      if (opIds.length === 0 || !snapshot || spec.endpoint === "delete") {
        show({ message });
        return;
      }
      // The snackbar only disappears at undoUntil; whether undo is still possible is decided by
      // the server when "Cofnij" is pressed (plan 2.6).
      show({
        message,
        action: {
          label: t.undo,
          onPress: () =>
            void undoOperation(qc, {
              operationIds: opIds,
              accountId,
              ids,
              snapshot,
              onUndo: input.onUndo,
            }),
        },
        hideAt: res.undoUntil ? Date.parse(res.undoUntil) : undefined,
      });
    },
    onError: (err, _vars, snapshot) => {
      if (snapshot) restoreSnapshot(qc, snapshot);
      toast(spec.error ? spec.error(err) : t.genericError);
    },
    onSettled: () => settle(qc, accountId, ids),
  });
  return mutation.execute(undefined).then(
    () => undefined,
    () => undefined,
  );
}

export type UndoInput = {
  /** One operation, or one per thread of a snooze. */
  operationIds: string[];
  accountId: string;
  ids: string[];
  snapshot: Snapshot;
  onUndo?: () => void;
};

/**
 * "Cofnij": the pre-operation snapshot comes back at once and the server undoes the operation
 * (POST /operations/{id}/undo, plan 5.2); its answer is the state written over the cache. A late
 * press is answered 409 undo_expired by the server, never decided here.
 */
export function undoOperation(qc: QueryClient, input: UndoInput): Promise<void> {
  const { operationIds, accountId, ids, snapshot } = input;
  hideToast();
  for (const id of operationIds) recentOps.delete(id);
  restoreSnapshot(qc, snapshot);
  input.onUndo?.();

  const mutation = qc.getMutationCache().build(qc, {
    mutationKey: MUTATION_KEY,
    scope: { id: scopeOf(ids) },
    mutationFn: async () => {
      const threads: Thread[] = [];
      for (const id of operationIds) {
        const res = await call(api().POST("/operations/{id}/undo", { params: { path: { id } } }));
        threads.push(...(res.threads ?? []));
      }
      return threads;
    },
    onSuccess: (threads: Thread[]) => mergeServerThreads(qc, accountId, threads),
    onError: (err) => {
      toast(isApiError(err, 409) ? t.undoExpired : t.genericError);
    },
    onSettled: () => settle(qc, accountId, ids),
  });
  return mutation.execute(undefined).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * operation.failed from SSE (plan 5.4, 5.7; wired in slice 5): the write-back was given up and
 * the server state restored. Like a rollback: the snapshot of the operation (when this app
 * started it) comes back at once, the server state is refetched and a snackbar explains it.
 */
export function handleOperationFailed(
  qc: QueryClient,
  event: { operationId?: string; accountId?: string; kind?: string; threadIds?: string[] },
): void {
  const entry = event.operationId ? recentOps.get(event.operationId) : undefined;
  if (entry) {
    recentOps.delete(event.operationId!);
    restoreSnapshot(qc, entry.snapshot);
  }
  const accountId = event.accountId ?? entry?.accountId;
  const ids = event.threadIds ?? [];
  if (accountId) {
    void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
    void qc.invalidateQueries({ queryKey: keys.labels(accountId) });
  }
  for (const id of ids) void qc.invalidateQueries({ queryKey: keys.thread(id) });
  toast(t.operationFailed(event.kind, Math.max(ids.length, 1)));
}

/** Whether a thread operation is in flight (SSE handlers of slice 5 defer refetches then). */
export function isThreadOpRunning(qc: QueryClient): boolean {
  return qc.isMutating({ mutationKey: MUTATION_KEY }) > 0;
}
