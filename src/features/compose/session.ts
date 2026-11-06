import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  cancelOutbound,
  deleteDraft,
  draftQuery,
  isAbortError,
  queueUpload,
  saveDraft,
  sendDraft,
  uploadFile,
  type PickedFile,
} from "../../api/drafts";
import { isApiError } from "../../api/errors";
import { keys } from "../../api/keys";
import type { Address, Draft, Meta, SendResult, UploadInfo } from "../../api/types";
import { formatSize } from "../../lib/format";
import { t } from "../../lib/i18n";
import { useAuth } from "../../state/auth";
import { useCompose } from "../../state/compose";
import { hideToast, show, toast } from "../../state/toasts";

/** Autosave after this much idle time (plan 3.8 step 1); tests shorten it. */
export const composeConfig = { autosaveMs: 2000 };

export type Field = "to" | "cc" | "bcc";

export type Form = {
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  bodyHtml: string;
  bodyJson: unknown;
  attachments: UploadInfo[];
};

/** An upload in progress (or failed) shown as an attachment tile with its progress bar. */
export type UploadItem = {
  key: number;
  name: string;
  size: number;
  /** 0..1 */
  progress: number;
  error?: string;
};

export type SessionState = {
  loaded: boolean;
  /** Grows on every (re)load from the server: the editor replaces its content then. */
  loadSeq: number;
  accountId: string;
  /** Version of the last load or save, sent back with PUT. */
  version: number;
  /** Draft.syncedVersion: the version written to the Drafts folder of the mail server. */
  syncedVersion: number;
  form: Form;
  uploads: UploadItem[];
  /** Edits not yet sent to the server. */
  dirty: boolean;
  save: "idle" | "saving" | "saved" | "error";
  /** 409 draft_version_conflict: another device or program saved meanwhile. */
  conflict: boolean;
  /** The draft as saved meanwhile (Problem.current of the 409): "Wczytaj" needs no GET. */
  conflictCurrent: Draft | null;
  /** Draft.serverChanged: the copy in the Drafts folder changed in another mail program. */
  serverChanged: boolean;
  sending: boolean;
  /** Message shown on the screen (send refused, load failed). */
  error: string | null;
  /** The recipient refused by the server (400/422 with address and field): its chip is red. */
  invalid: { address: string; field: Field } | null;
};

const emptyForm: Form = {
  to: [],
  cc: [],
  bcc: [],
  subject: "",
  bodyHtml: "",
  bodyJson: null,
  attachments: [],
};

const formOf = (d: Draft): Form => ({
  to: d.to ?? [],
  cc: d.cc ?? [],
  bcc: d.bcc ?? [],
  subject: d.subject,
  bodyHtml: d.bodyHtml,
  bodyJson: d.bodyJson ?? null,
  attachments: d.attachments ?? [],
});

let uploadSeq = 0;

/**
 * Editing state of one open draft, kept outside React so that the save started by leaving the
 * screen finishes after the screen is gone (port of silo-web's DraftSession). The server owns the
 * draft (plan 2.6): this keeps the edits in memory only and sends PUT /drafts/{id} with the
 * version it edited after 2 s of idle time, when a field loses focus, when the app goes to the
 * background and when the screen closes (the last two with syncNow).
 */
export class DraftSession {
  private state: SessionState = {
    loaded: false,
    loadSeq: 0,
    accountId: "",
    version: 0,
    syncedVersion: 0,
    form: emptyForm,
    uploads: [],
    dirty: false,
    save: "idle",
    conflict: false,
    conflictCurrent: null,
    serverChanged: false,
    sending: false,
    error: null,
    invalid: null,
  };
  private listeners = new Set<() => void>();
  private saving: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private uploadAborts = new Map<number, AbortController>();
  /** Created by this screen (new message, reply) and never saved: closing deletes it. */
  createdHere = false;
  /** Saved at least once by this session. */
  private saved = false;
  closed = false;

  constructor(
    readonly id: string,
    private readonly qc: QueryClient,
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getState = () => this.state;

  private get dirty() {
    return this.state.dirty;
  }

  private set(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  load(d: Draft) {
    clearTimeout(this.timer);
    this.qc.setQueryData(keys.draft(this.id), d);
    // Draft.lastSend: a failed send stays visible after a reload (plan 3.9).
    useCompose
      .getState()
      .setFailure(
        this.id,
        d.lastSend
          ? { error: d.lastSend.error, failedRecipients: d.lastSend.failedRecipients ?? undefined }
          : null,
      );
    this.set({
      loaded: true,
      loadSeq: this.state.loadSeq + 1,
      accountId: d.accountId,
      version: d.version,
      syncedVersion: d.syncedVersion,
      form: formOf(d),
      dirty: false,
      conflict: false,
      conflictCurrent: null,
      serverChanged: d.serverChanged,
      save: "idle",
      error: null,
      invalid: null,
    });
  }

  /** GET /drafts/{id} unless loaded (a draft opened from a list or a notification). */
  async ensureLoaded() {
    if (this.state.loaded) return;
    try {
      const d = await this.qc.fetchQuery({ ...draftQuery(this.id), staleTime: 0 });
      if (!this.state.loaded) this.load(d);
    } catch {
      this.set({ error: t.draftLoadError });
    }
  }

  private fetchCurrent() {
    return this.qc.fetchQuery({ ...draftQuery(this.id), staleTime: 0 });
  }

  /** "Wczytaj": the draft as the server has it now; local edits are dropped (no merging). */
  async reload() {
    try {
      // After a 409 the problem carried the current draft; after draft.updated it is fetched.
      this.load(this.state.conflictCurrent ?? (await this.fetchCurrent()));
    } catch {
      this.set({ error: t.draftLoadError });
    }
  }

  /** "Nadpisz": save the local content over the server's version. */
  async overwrite() {
    try {
      const version = this.state.conflictCurrent?.version ?? (await this.fetchCurrent()).version;
      this.set({ version, conflict: false, conflictCurrent: null, dirty: true });
      await this.save();
    } catch {
      this.set({ error: t.draftLoadError });
    }
  }

  edit(change: (f: Form) => Partial<Form>) {
    const form = { ...this.state.form, ...change(this.state.form) };
    const bad = this.state.invalid;
    const stillBad = bad !== null && form[bad.field].some((a) => a.email === bad.address);
    this.set({ form, dirty: true, save: "idle", ...(stillBad ? {} : { invalid: null }) });
    this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    if (this.state.conflict || this.closed) return;
    this.timer = setTimeout(() => void this.save(), composeConfig.autosaveMs);
  }

  /**
   * PUT /drafts/{id} if there are unsaved edits; resolves false when the save failed. syncNow
   * asks the server to write the Drafts folder copy at once (plan 3.8).
   */
  async save(syncNow = false): Promise<boolean> {
    clearTimeout(this.timer);
    while (this.saving) await this.saving;
    if (this.state.conflict) return false;
    if (!this.dirty) return true;
    const f = this.state.form;
    this.set({ dirty: false, save: "saving" });
    const run = (async () => {
      try {
        const d = await saveDraft(
          this.id,
          this.state.version,
          {
            to: f.to,
            cc: f.cc,
            bcc: f.bcc,
            subject: f.subject,
            bodyHtml: f.bodyHtml,
            bodyJson: f.bodyJson,
            attachmentIds: f.attachments.map((a) => a.id),
          },
          syncNow,
        );
        this.saved = true;
        this.qc.setQueryData(keys.draft(this.id), d);
        this.set({
          version: d.version,
          syncedVersion: d.syncedVersion,
          save: this.dirty ? "idle" : "saved",
          serverChanged: this.state.serverChanged && d.serverChanged,
        });
        void this.qc.invalidateQueries({ queryKey: keys.threadsAll(d.accountId) });
        return true;
      } catch (err) {
        if (isApiError(err, 409) && err.code !== "send_in_progress") {
          this.set({
            dirty: true,
            conflict: true,
            conflictCurrent: err.problem?.current ?? null,
            save: "idle",
          });
        } else {
          this.set({
            dirty: true,
            save: "error",
            invalid: invalidOf(err) ?? this.state.invalid,
          });
        }
        return false;
      }
    })();
    this.saving = run;
    const ok = await run;
    this.saving = null;
    if (ok && this.dirty) this.schedule();
    return ok && !this.dirty;
  }

  /** Saves until nothing is left (edits made during a save are saved too). */
  private async flush(syncNow = false): Promise<boolean> {
    for (let i = 0; i < 3 && (this.dirty || this.saving); i++) {
      if (!(await this.save(syncNow))) return false;
    }
    return !this.dirty;
  }

  private get unsynced() {
    return this.saved && this.state.syncedVersion < this.state.version;
  }

  /**
   * The app goes to the background: the edits are saved with syncNow, since Android may end the
   * process before it comes back (the in-memory buffer would be lost, plan 2.6).
   */
  async flushNow(): Promise<boolean> {
    if (this.closed || !this.state.loaded) return true;
    if (!this.dirty && !this.saving && !this.unsynced) return true;
    this.set({ dirty: true });
    return this.flush(true);
  }

  addFiles(files: PickedFile[]) {
    // GET /meta maxAttachmentBytes: a file over the limit is refused before it is uploaded.
    const { serverUrl } = useAuth.getState();
    const max = serverUrl
      ? this.qc.getQueryData<Meta>(keys.meta(serverUrl))?.maxAttachmentBytes
      : undefined;
    for (const file of files) {
      if (max && file.size > max) {
        toast(t.uploadTooLarge(file.name, formatSize(max)));
        continue;
      }
      const key = ++uploadSeq;
      const abort = new AbortController();
      this.uploadAborts.set(key, abort);
      const item: UploadItem = { key, name: file.name, size: file.size, progress: 0 };
      this.set({ uploads: [...this.state.uploads, item], error: null });
      const patch = (p: Partial<UploadItem>) =>
        this.set({ uploads: this.state.uploads.map((u) => (u.key === key ? { ...u, ...p } : u)) });
      queueUpload(() =>
        abort.signal.aborted
          ? Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
          : uploadFile(file, (progress) => patch({ progress }), abort.signal),
      ).then(
        (info) => {
          this.uploadAborts.delete(key);
          if (this.closed) return;
          this.set({ uploads: this.state.uploads.filter((u) => u.key !== key) });
          this.edit((f) => ({ attachments: [...f.attachments, info] }));
        },
        (err: unknown) => {
          this.uploadAborts.delete(key);
          if (isAbortError(err) || this.closed) return;
          const limit = isApiError(err, 413) ? (err.problem?.limit ?? max) : undefined;
          patch({
            error: isApiError(err, 413)
              ? t.uploadTooLarge(file.name, limit ? formatSize(limit) : undefined)
              : t.uploadFailed(file.name),
          });
        },
      );
    }
  }

  /** "x" on an upload tile: cancels the request (AbortSignal) or drops the failed tile. */
  removeUpload(key: number) {
    this.uploadAborts.get(key)?.abort();
    this.uploadAborts.delete(key);
    this.set({ uploads: this.state.uploads.filter((u) => u.key !== key) });
  }

  /** Removes it from attachmentIds; the server detaches it on the next save. */
  removeAttachment(id: string) {
    this.edit((f) => ({ attachments: f.attachments.filter((a) => a.id !== id) }));
  }

  /** Stops the autosave timer and the uploads. */
  dispose() {
    this.closed = true;
    clearTimeout(this.timer);
    for (const a of this.uploadAborts.values()) a.abort();
    this.uploadAborts.clear();
  }

  /**
   * The screen closes (X, back): the last save with syncNow, so that the Drafts folder copy is
   * written at once (plan 3.8), and "Zapisano wersję roboczą". A new draft nobody wrote in is
   * deleted at once, as in Gmail: the server drops such drafts only after 24 h.
   */
  async close() {
    if (this.closed) return;
    this.dispose();
    if (this.dirty || this.saving || this.unsynced) {
      // An autosave not yet in the Drafts folder is sent again, now with syncNow.
      this.set({ dirty: true });
      toast((await this.flush(true)) ? t.draftSaved : t.draftNotSaved);
    } else if (this.createdHere && !this.saved) {
      await deleteDraft(this.id).catch(() => undefined);
      this.qc.removeQueries({ queryKey: keys.draft(this.id) });
      void this.qc.invalidateQueries({ queryKey: keys.threadsAll(this.state.accountId) });
    } else if (this.saved) toast(t.draftSaved);
    if (this.closed) sessions.delete(this.id);
  }

  /** "Odrzuć" (after the confirmation): DELETE /drafts/{id}; the server keeps no undo for it. */
  async discard() {
    this.dispose();
    this.set({ dirty: false });
    sessions.delete(this.id);
    try {
      while (this.saving) await this.saving;
      await deleteDraft(this.id);
      toast(t.draftDiscarded);
    } catch {
      toast(t.genericError);
    }
    this.qc.removeQueries({ queryKey: keys.draft(this.id) });
    void this.qc.invalidateQueries({ queryKey: keys.threadsAll(this.state.accountId) });
  }

  /**
   * "Wyślij": the only local check is "at least one recipient" (the server validates the rest,
   * plan 2.6), then the last PUT and POST /drafts/{id}/send (plan 3.9). Resolves true when the
   * message was handed to the server; the screen closes then.
   */
  async send(): Promise<boolean> {
    if (this.state.sending) return false;
    const f = this.state.form;
    if (f.to.length + f.cc.length + f.bcc.length === 0) {
      this.set({ error: t.noRecipients });
      return false;
    }
    if (this.state.uploads.some((u) => !u.error)) {
      this.set({ error: t.uploadsPending });
      return false;
    }
    this.set({ sending: true, error: null });
    useCompose.getState().setFailure(this.id, null);
    if (!(await this.flush())) {
      this.set({ sending: false, error: this.state.conflict ? null : t.draftNotSaved });
      return false;
    }
    let res: SendResult;
    try {
      res = await sendDraft(this.id);
    } catch (err) {
      this.set({
        sending: false,
        error: sendErrorMessage(err),
        invalid: invalidOf(err) ?? this.state.invalid,
      });
      return false;
    }
    this.dispose();
    sessions.delete(this.id);
    this.qc.removeQueries({ queryKey: keys.draft(this.id) });
    void this.qc.invalidateQueries({ queryKey: keys.threadsAll(this.state.accountId) });
    showSent(this.qc, res, this.state.accountId);
    return true;
  }
}

/** The refused recipient of invalid_address / validation_failed (Problem.address, field). */
function invalidOf(err: unknown): SessionState["invalid"] {
  if (!isApiError(err)) return null;
  const p = err.problem;
  return p?.address && p.field ? { address: p.address, field: p.field } : null;
}

const size = (n: number | undefined) => (n ? formatSize(n) : undefined);

export function sendErrorMessage(err: unknown): string {
  if (!isApiError(err)) return t.genericError;
  const p = err.problem;
  switch (err.code) {
    case "no_recipients":
      return t.noRecipients;
    case "invalid_address":
    case "validation_failed":
      return p?.address ? t.invalidAddressOf(p.address) : t.invalidAddress;
    case "message_too_large":
      return t.messageTooLarge(size(p?.limit), size(p?.size));
    case "send_in_progress":
      return t.sendInProgress;
    case "upstream_smtp_error":
      return t.smtpError(p?.detail);
    default:
      return t.genericError;
  }
}

const sessions = new Map<string, DraftSession>();

export function getSession(qc: QueryClient, id: string): DraftSession {
  let s = sessions.get(id);
  if (!s) {
    s = new DraftSession(id, qc);
    sessions.set(id, s);
  }
  s.closed = false;
  return s;
}

/** For tests: stop and forget all sessions (pending autosaves included). */
export function resetSessions() {
  for (const s of sessions.values()) s.dispose();
  sessions.clear();
}

/** Seeds the session of a draft the caller already has (POST /drafts, cancel of a send). */
export function openLoaded(qc: QueryClient, d: Draft, opts: { created?: boolean } = {}) {
  const s = getSession(qc, d.id);
  s.load(d);
  if (opts.created) s.createdHere = true;
  return s;
}

/** Path of the compose screen for a draft. */
export const composeHref = (draftId: string) => `/compose?draftId=${encodeURIComponent(draftId)}`;

/**
 * "Wysłano · Cofnij" until undoUntil (plan 6.5). The undo window is the server's: the snackbar
 * only stays as long, and no local timer delays the send (plan 2.6).
 */
export function showSent(qc: QueryClient, res: SendResult, accountId: string) {
  show({
    message: t.messageSent,
    action: { label: t.undo, onPress: () => void undoSend(qc, res.outboundId, accountId) },
    hideAt: Date.parse(res.undoUntil),
  });
}

/** "Cofnij": POST /outbound/{id}/cancel; the draft it answers opens in compose again. */
export async function undoSend(qc: QueryClient, outboundId: string, accountId: string) {
  hideToast();
  try {
    const d = await cancelOutbound(outboundId);
    openLoaded(qc, d);
    router.push(composeHref(d.id));
    toast(t.sendUndone);
  } catch (err) {
    toast(isApiError(err, 409) ? t.tooLateToUndo : t.genericError);
  }
  void qc.invalidateQueries({ queryKey: keys.threadsAll(accountId) });
}
