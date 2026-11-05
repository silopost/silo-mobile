import { queryOptions } from "@tanstack/react-query";
import { inlineAttachmentIds, toBase64 } from "../../lib/messageHtml";
import { api } from "../client";
import { call, isApiError } from "../errors";
import { keys } from "../keys";
import type { MessageAttachment } from "../types";

export const MAX_RETRIES = 6;

/**
 * Sanitised HTML of a message (port of silo-web). The response is immutable, so it never goes
 * stale. A body that is not mirrored yet answers 503 content_not_available with Retry-After (plan
 * 5.1): the query retries after the advised delay (up to 6 times) and the card shows a spinner.
 */
export const messageHtmlQuery = (id: string) =>
  queryOptions({
    queryKey: keys.messageHtml(id),
    queryFn: async ({ signal }) =>
      (await call(
        api().GET("/messages/{id}/html", { params: { path: { id } }, parseAs: "text", signal }),
      )) as string,
    staleTime: Infinity,
    retry: (count, err) => isApiError(err, 503) && count < MAX_RETRIES,
    retryDelay: (_count, err) => ((isApiError(err) ? err.retryAfter : undefined) ?? 2) * 1000,
  });

/** Most bytes of inline images turned into data URIs per message. */
export const INLINE_BUDGET = 5 * 1024 * 1024;

/**
 * The cid: images of a message as data URIs, by attachment id. The server points them at
 * /attachments/{id}?inline=1, which needs the bearer header; a WebView sends no header with the
 * requests of a page and a token in the URL is not allowed (ADR 0007), so the app fetches them
 * itself. Images over the budget, or failing, are left out (the WebView shows them broken).
 */
export async function fetchInlineImages(
  html: string,
  attachments: MessageAttachment[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let budget = INLINE_BUDGET;
  for (const id of inlineAttachmentIds(html)) {
    const meta = attachments.find((a) => a.id === id);
    if (meta && meta.size > budget) continue;
    try {
      const { data, response } = await api().GET("/attachments/{id}", {
        params: { path: { id }, query: { inline: true } },
        parseAs: "arrayBuffer",
        signal,
      });
      if (!response.ok || !data) continue;
      const bytes = new Uint8Array(data as unknown as ArrayBuffer);
      if (bytes.byteLength > budget) continue;
      budget -= bytes.byteLength;
      const type =
        meta?.contentType ||
        response.headers.get("Content-Type")?.split(";")[0] ||
        "application/octet-stream";
      out[id] = `data:${type};base64,${toBase64(bytes)}`;
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  return out;
}

/** fetchInlineImages as a query: the bytes of an attachment never change. */
export const inlineImagesQuery = (
  messageId: string,
  html: string | undefined,
  attachments: MessageAttachment[],
) =>
  queryOptions({
    queryKey: keys.messageInline(messageId),
    queryFn: ({ signal }) => fetchInlineImages(html ?? "", attachments, signal),
    enabled: html !== undefined && inlineAttachmentIds(html).length > 0,
    staleTime: Infinity,
    retry: false,
  });
