import { queryOptions } from "@tanstack/react-query";
import { toBase64 } from "../lib/messageHtml";
import { useAuth } from "../state/auth";
import { forgetSession } from "./cache";
import { api, apiBaseUrl, clientId } from "./client";
import { ApiError, call, type Problem } from "./errors";
import { keys } from "./keys";
import type { Address, CreateDraftBody, Draft, Recipient, SendResult, UploadInfo } from "./types";

/** GET /drafts/{id}. */
export const draftQuery = (id: string) =>
  queryOptions({
    queryKey: keys.draft(id),
    queryFn: ({ signal }) => call(api().GET("/drafts/{id}", { params: { path: { id } }, signal })),
    // The compose screen owns the draft while it is open; it refetches only on "Wczytaj".
    staleTime: Infinity,
  });

export const createDraft = (body: CreateDraftBody): Promise<Draft> =>
  call(api().POST("/drafts", { body }));

/** The editable fields of a draft, as PUT /drafts/{id} takes them. */
export type DraftFields = {
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  bodyHtml: string;
  bodyJson: unknown;
  attachmentIds: string[];
};

const recipients = (list: Address[]): Recipient[] =>
  list.map((a) => (a.name ? { email: a.email, name: a.name } : { email: a.email }));

/**
 * PUT /drafts/{id} with the version that was edited (409 draft_version_conflict otherwise).
 * syncNow: the copy in the Drafts folder of the mail server is written at once (screen closed,
 * plan 3.8) instead of after the server's own delay.
 */
export const saveDraft = (
  id: string,
  version: number,
  f: DraftFields,
  syncNow = false,
): Promise<Draft> =>
  call(
    api().PUT("/drafts/{id}", {
      params: { path: { id } },
      body: {
        version,
        to: recipients(f.to),
        cc: recipients(f.cc),
        bcc: recipients(f.bcc),
        subject: f.subject,
        bodyHtml: f.bodyHtml,
        bodyJson: f.bodyJson ?? undefined,
        attachmentIds: f.attachmentIds,
        ...(syncNow ? { syncNow: true } : {}),
      },
    }),
  );

export const deleteDraft = (id: string): Promise<unknown> =>
  call(api().DELETE("/drafts/{id}", { params: { path: { id } } }));

/** POST /drafts/{id}/send now, or at `sendAt` (scheduled send, server 0.4.0). */
export const sendDraft = (id: string, sendAt?: string): Promise<SendResult> =>
  call(
    api().POST("/drafts/{id}/send", {
      params: { path: { id } },
      body: sendAt ? { sendAt } : {},
    }),
  );

/** "Cofnij" of a send: the server answers with the draft the message became again. */
export const cancelOutbound = (id: string): Promise<Draft> =>
  call(api().POST("/outbound/{id}/cancel", { params: { path: { id } } }));

/** GET /contacts/autocomplete?q= */
export const contactsQuery = (q: string) =>
  queryOptions({
    queryKey: keys.contacts(q),
    queryFn: ({ signal }) =>
      call(api().GET("/contacts/autocomplete", { params: { query: { q } }, signal })),
    staleTime: 60_000,
  });

/** A file picked on the device (document or image picker). */
export type PickedFile = { uri: string; name: string; type: string; size: number };

export const uploadConfig = {
  /** Replaced in tests by a fake XMLHttpRequest. */
  createXhr: (): XMLHttpRequest => new XMLHttpRequest(),
};

/** The error an aborted upload rejects with (React Native has no DOMException). */
export const abortError = () => Object.assign(new Error("aborted"), { name: "AbortError" });
export const isAbortError = (err: unknown) => err instanceof Error && err.name === "AbortError";

/**
 * POST /uploads (multipart, field `file`) through XMLHttpRequest, which reports upload progress
 * (plan 5.6); fetch does not. React Native sends a file from its URI when FormData gets
 * `{uri, name, type}`. Same headers as the API client: bearer token and X-Silo-Client. Rejects
 * with ApiError for an error answer (413 upload_too_large carries limit and size). `inline`
 * (server 0.4.0): a picture shown in the body; the form field comes before the file and the
 * answer carries its cid (422 inline_not_image for other types).
 */
export async function uploadFile(
  file: PickedFile,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
  inline = false,
): Promise<UploadInfo> {
  const { serverUrl, token } = useAuth.getState();
  if (!serverUrl) throw new Error("No Silo server configured");
  const client = await clientId();
  if (signal?.aborted) throw abortError();
  return new Promise((resolve, reject) => {
    const xhr = uploadConfig.createXhr();
    xhr.open("POST", `${apiBaseUrl(serverUrl)}/uploads`);
    xhr.setRequestHeader("X-Silo-Client", client);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve(body as UploadInfo);
        return;
      }
      // The session ended meanwhile: sign out as the API client does.
      if (xhr.status === 401 && token && useAuth.getState().token === token) void forgetSession();
      const header = xhr.getResponseHeader("Retry-After");
      const retryAfter = header && /^\d+$/.test(header) ? Number(header) : undefined;
      const problem = typeof body === "object" && body !== null ? (body as Problem) : undefined;
      reject(new ApiError(xhr.status, problem, retryAfter));
    };
    xhr.onerror = () => reject(new ApiError(0, undefined, undefined));
    xhr.onabort = () => reject(abortError());
    signal?.addEventListener("abort", () => xhr.abort());
    const form = new FormData();
    if (inline) form.append("inline", "true");
    // React Native's FormData reads the file from `uri`; the DOM typings only know Blob.
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    xhr.send(form);
  });
}

/**
 * An inline upload of a draft (u_ id) as a data URI for the preview in the editor: GET
 * /attachments/{id}?inline=1 with the bearer header, the same way the thread shows cid: images.
 */
export async function fetchUploadDataUri(id: string, contentType: string): Promise<string | null> {
  const { data, response } = await api().GET("/attachments/{id}", {
    params: { path: { id }, query: { inline: true } },
    parseAs: "arrayBuffer",
  });
  if (!response.ok || !data) return null;
  const bytes = new Uint8Array(data as unknown as ArrayBuffer);
  const type = contentType || response.headers.get("Content-Type")?.split(";")[0] || "image/png";
  return `data:${type};base64,${toBase64(bytes)}`;
}

export const MAX_PARALLEL_UPLOADS = 3;
let running = 0;
const waiting: (() => void)[] = [];

/** Runs at most three uploads at once (plan 5.6); the rest wait in order. */
export async function queueUpload<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL_UPLOADS) await new Promise<void>((r) => waiting.push(r));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}
