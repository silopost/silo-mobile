import type { UploadInfo } from "../api/types";

/**
 * Inline pictures of a draft (plan 5.6, server 0.4.0). The server generates the Content-ID of an
 * inline upload and expects `<img src="cid:…">` in bodyHtml. The editor runs in a WebView that
 * cannot load `cid:` nor the authenticated `/api/v1/attachments/{u_…}?inline=1` (no cookie, and
 * no token in a URL, ADR 0007), so it shows data URIs read on the device; these helpers convert
 * between the editor's form and the server's. Text only, no HTML parser: the sources are the
 * exact strings the app put in.
 */

/** The URL silo-web's editor shows an inline upload with (its bodyJson keeps it, with `cid`). */
export const inlineUploadUrl = (id: string) =>
  `/api/v1/attachments/${encodeURIComponent(id)}?inline=1`;

const UPLOAD_URL = /\/api\/v1\/attachments\/(u_[0-9A-Za-z]+)\?inline=1/g;

/** Data URIs shown in the editor, by the cid of their upload. */
export type Previews = Map<string, string>;

const cidOfPreview = (previews: Previews, src: string) => {
  for (const [cid, uri] of previews) if (uri === src) return cid;
  return undefined;
};

/** The inline uploads with a cid, by id. */
const cidsById = (attachments: UploadInfo[]) =>
  new Map(attachments.filter((a) => a.inline && a.cid).map((a) => [a.id, a.cid!] as const));

/** Editor HTML → bodyHtml of PUT /drafts/{id}: previews and upload URLs become `cid:`. */
export function toServerHtml(html: string, previews: Previews, attachments: UploadInfo[]): string {
  let out = html;
  for (const [cid, uri] of previews) out = out.split(uri).join(`cid:${cid}`);
  const byId = cidsById(attachments);
  return out.replace(UPLOAD_URL, (url, id: string) => {
    const cid = byId.get(id);
    return cid ? `cid:${cid}` : url;
  });
}

/** Walks a TipTap document and rewrites the `src` of image nodes. */
function mapImages(
  node: unknown,
  map: (attrs: Record<string, unknown>) => Record<string, unknown>,
): unknown {
  if (Array.isArray(node)) return node.map((n) => mapImages(n, map));
  if (!node || typeof node !== "object") return node;
  const obj = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = k === "content" ? mapImages(v, map) : v;
  if (obj.type === "image" && obj.attrs && typeof obj.attrs === "object")
    out.attrs = map(obj.attrs as Record<string, unknown>);
  return out;
}

/**
 * Editor JSON → bodyJson of PUT /drafts/{id}: a preview becomes the upload's URL with its `cid`,
 * the form silo-web's editor keeps, so the draft opens there with its pictures; no data URI is
 * stored in the draft.
 */
export function toServerJson(
  json: unknown,
  previews: Previews,
  attachments: UploadInfo[],
): unknown {
  if (previews.size === 0) return json;
  const byCid = new Map(attachments.filter((a) => a.cid).map((a) => [a.cid!, a.id] as const));
  return mapImages(json, (attrs) => {
    const src = typeof attrs.src === "string" ? attrs.src : "";
    const cid = cidOfPreview(previews, src);
    const id = cid ? byCid.get(cid) : undefined;
    return cid && id ? { ...attrs, src: inlineUploadUrl(id), cid } : attrs;
  });
}

/**
 * bodyHtml / bodyJson of the server → what the editor can show: `cid:` sources and upload URLs of
 * the known inline uploads become their data URIs. Unknown ones are left as they are.
 */
export function toEditorContent(
  content: unknown,
  previews: Previews,
  attachments: UploadInfo[],
): unknown {
  if (previews.size === 0) return content;
  const byId = cidsById(attachments);
  const srcOf = (src: string) => {
    if (src.startsWith("cid:")) return previews.get(src.slice(4));
    const m = /\/api\/v1\/attachments\/(u_[0-9A-Za-z]+)\?inline=1/.exec(src);
    const cid = m ? byId.get(m[1]!) : undefined;
    return cid ? previews.get(cid) : undefined;
  };
  if (typeof content === "string") {
    let out = content;
    for (const [cid, uri] of previews) out = out.split(`cid:${cid}`).join(uri);
    return out.replace(UPLOAD_URL, (url, id: string) => {
      const cid = byId.get(id);
      return (cid && previews.get(cid)) || url;
    });
  }
  return mapImages(content, (attrs) => {
    const uri = typeof attrs.src === "string" ? srcOf(attrs.src) : undefined;
    return uri ? { ...attrs, src: uri } : attrs;
  });
}

/** Whether the HTML still shows the inline upload (as preview, cid or upload URL). */
export function refersToInline(html: string, a: UploadInfo, previews: Previews): boolean {
  if (!a.cid) return true;
  const preview = previews.get(a.cid);
  return (
    html.includes(`cid:${a.cid}`) ||
    html.includes(inlineUploadUrl(a.id)) ||
    (preview !== undefined && html.includes(preview))
  );
}

/** Whether a draft body shows inline pictures of its own uploads. */
export function hasInlineImages(html: string, attachments: UploadInfo[]): boolean {
  return attachments.some((a) => a.inline && a.cid && html.includes(`cid:${a.cid}`));
}
