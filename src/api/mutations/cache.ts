import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { keys, type ListFilter } from "../keys";
import type { Label, Thread, ThreadDetail, ThreadPage } from "../types";

export type ThreadLists = InfiniteData<ThreadPage, string | undefined>;
export type LabelsData = { labels: Label[] | null };
export type Snapshot = [QueryKey, unknown][];

/** Copies the cached lists, labels and threads an operation may touch (plan 6.5 step 1). */
export function takeSnapshot(qc: QueryClient, accountId: string, ids: string[]): Snapshot {
  return [
    ...qc.getQueriesData({ queryKey: keys.threadsAll(accountId) }),
    ...qc.getQueriesData({ queryKey: keys.labels(accountId) }),
    ...ids.map((id): [QueryKey, unknown] => [keys.thread(id), qc.getQueryData(keys.thread(id))]),
  ];
}

export function restoreSnapshot(qc: QueryClient, snapshot: Snapshot): void {
  for (const [key, data] of snapshot) {
    if (data !== undefined) qc.setQueryData(key, data);
  }
}

/** Whether a thread with these labels is listed under the filter. */
function belongs(filter: ListFilter, labelIds: string[]): boolean {
  if (filter.q !== undefined) return true;
  if (filter.labelId === undefined)
    return !labelIds.includes("TRASH") && !labelIds.includes("SPAM");
  return labelIds.includes(filter.labelId);
}

/**
 * Rewrites every cached list of the account: `fn` returns the new row, the same row (unchanged) or
 * null (removed). A changed row that no longer belongs to the list is removed.
 */
export function updateLists(
  qc: QueryClient,
  accountId: string,
  fn: (t: Thread) => Thread | null,
): void {
  for (const [key, data] of qc.getQueriesData<ThreadLists>({
    queryKey: keys.threadsAll(accountId),
  })) {
    if (!data) continue;
    const filter = (key[2] ?? {}) as ListFilter;
    let changed = false;
    const pages = data.pages.map((page) => {
      const threads = (page.threads ?? []).flatMap((t) => {
        const next = fn(t);
        if (next === t) return [t];
        changed = true;
        return next && belongs(filter, next.labelIds ?? []) ? [next] : [];
      });
      return { ...page, threads };
    });
    if (changed) qc.setQueryData<ThreadLists>(key, { ...data, pages });
  }
}

/** Optimistic label change of one thread (display only; the server answer replaces it). */
export function patchLabelIds(labelIds: string[], add: string[], remove: string[]): string[] {
  let next = labelIds.filter((l) => !remove.includes(l));
  if (add.includes("TRASH") || add.includes("SPAM")) {
    // Trash and Spam are folders: the thread leaves Inbox/Archive and the other one.
    next = next.filter((l) => !["INBOX", "ARCHIVE", "TRASH", "SPAM"].includes(l));
  }
  for (const l of add) if (!next.includes(l)) next.push(l);
  return next;
}

function patchThread(t: Thread, add: string[], remove: string[]): Thread {
  const labelIds = patchLabelIds(t.labelIds ?? [], add, remove);
  if (remove.includes("UNREAD")) {
    return {
      ...t,
      labelIds,
      unreadCount: 0,
      participants: (t.participants ?? []).map((p) => ({ ...p, unread: false })),
    };
  }
  if (add.includes("UNREAD")) return { ...t, labelIds, unreadCount: Math.max(t.unreadCount, 1) };
  return { ...t, labelIds };
}

function cachedLabelIds(qc: QueryClient, accountId: string, id: string): string[] | undefined {
  const detail = qc.getQueryData<ThreadDetail>(keys.thread(id));
  if (detail) return detail.labelIds ?? [];
  for (const [, data] of qc.getQueriesData<ThreadLists>({ queryKey: keys.threadsAll(accountId) })) {
    for (const page of data?.pages ?? []) {
      const t = page.threads?.find((x) => x.id === id);
      if (t) return t.labelIds ?? [];
    }
  }
  return undefined;
}

/** Adjusts LeftNav counters for label changes; unread = the UNREAD pseudo label. */
function adjustCounts(qc: QueryClient, accountId: string, changes: [string[], string[]][]): void {
  qc.setQueryData<LabelsData>(keys.labels(accountId), (data) => {
    if (!data?.labels) return data;
    const labels = data.labels.map((l) => {
      let total = l.threadsTotal;
      let unread = l.threadsUnread;
      for (const [before, after] of changes) {
        const was = before.includes(l.id);
        const is = after.includes(l.id);
        total += Number(is) - Number(was);
        unread += Number(is && after.includes("UNREAD")) - Number(was && before.includes("UNREAD"));
      }
      return total === l.threadsTotal && unread === l.threadsUnread
        ? l
        : { ...l, threadsTotal: Math.max(0, total), threadsUnread: Math.max(0, unread) };
    });
    return { ...data, labels };
  });
}

/** Applies a label change to lists, open threads and counters before the server answers. */
export function applyOptimistic(
  qc: QueryClient,
  accountId: string,
  ids: string[],
  add: string[],
  remove: string[],
): void {
  const changes: [string[], string[]][] = [];
  for (const id of ids) {
    const before = cachedLabelIds(qc, accountId, id);
    if (before) changes.push([before, patchLabelIds(before, add, remove)]);
  }
  const set = new Set(ids);
  updateLists(qc, accountId, (t) => (set.has(t.id) ? patchThread(t, add, remove) : t));
  for (const id of ids) {
    qc.setQueryData<ThreadDetail>(keys.thread(id), (d) =>
      d ? { ...d, labelIds: patchLabelIds(d.labelIds ?? [], add, remove) } : d,
    );
  }
  adjustCounts(qc, accountId, changes);
}

/** A thread row from any cached list (all accounts). */
export function findCachedThread(qc: QueryClient, id: string): Thread | undefined {
  for (const [, data] of qc.getQueriesData<ThreadLists>({ queryKey: ["threads"] })) {
    for (const page of data?.pages ?? []) {
      const t = page.threads?.find((x) => x.id === id);
      if (t) return t;
    }
  }
  return undefined;
}

/** Removes threads from every list (permanent delete). */
export function removeFromLists(qc: QueryClient, accountId: string, ids: string[]): void {
  const set = new Set(ids);
  updateLists(qc, accountId, (t) => (set.has(t.id) ? null : t));
}

/** Overwrites cached rows and open threads with the state the server answered. */
export function mergeServerThreads(qc: QueryClient, accountId: string, threads: Thread[]): void {
  const byId = new Map(threads.map((t) => [t.id, t]));
  updateLists(qc, accountId, (t) => byId.get(t.id) ?? t);
  for (const t of threads) {
    qc.setQueryData<ThreadDetail>(keys.thread(t.id), (d) =>
      d ? { ...d, labelIds: t.labelIds } : d,
    );
  }
}

/** Finds the row after (or before) a thread in a cached list, for j/k and "next after archive". */
export function neighbourInList(
  qc: QueryClient,
  accountId: string,
  filter: ListFilter,
  id: string,
  step: 1 | -1,
): string | undefined {
  const data = qc.getQueryData<ThreadLists>(keys.threads(accountId, filter));
  const rows = data?.pages.flatMap((p) => p.threads ?? []) ?? [];
  const i = rows.findIndex((t) => t.id === id);
  return i < 0 ? undefined : rows[i + step]?.id;
}

/**
 * Labels that are a location of a thread (one at a time on the server): Inbox, Spam, Trash and
 * the server folders. A move to one of them leaves the others (plan 4.4); used for the optimistic
 * change only, the server does the move.
 */
export function locationLabelIds(qc: QueryClient, accountId: string): string[] {
  const folders =
    qc
      .getQueryData<LabelsData>(keys.labels(accountId))
      ?.labels?.filter((l) => l.type === "folder")
      .map((l) => l.id) ?? [];
  return ["INBOX", "SPAM", "TRASH", ...folders];
}
