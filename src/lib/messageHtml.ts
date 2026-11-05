/**
 * Message HTML for the WebView of a message card (plan 6.3). The server already removed scripts,
 * handlers, forms and frames (GET /messages/{id}/html); this is the client's second line: remote
 * images blocked by a Content-Security-Policy until "Pokaż obrazy", inline (cid:) images swapped
 * for data URIs fetched with the bearer header, and a small script of the app that reports the
 * height of the document.
 */

/** URLs the server gives cid: images; the id is the attachment's. */
const INLINE_URL = /\/api\/v1\/attachments\/(a_[0-9A-Za-z]+)\?inline=1/g;

const REMOTE_IMAGE = /<img\b[^>]*\bsrc\s*=\s*["']?\s*(https?:)?\/\//i;
const REMOTE_CSS_IMAGE = /url\(\s*["']?\s*(https?:)?\/\//i;

/** Ids of the attachments the HTML shows inline, in order, once each. */
export function inlineAttachmentIds(html: string): string[] {
  return [...new Set([...html.matchAll(INLINE_URL)].map((m) => m[1]!))];
}

/** Whether the message loads images from the internet (the "Pokaż obrazy" bar). */
export function hasRemoteImages(html: string): boolean {
  return REMOTE_IMAGE.test(html) || REMOTE_CSS_IMAGE.test(html);
}

/** Content-Security-Policy of the document: nothing remote unless images are shown. */
export function contentPolicy(showImages: boolean): string {
  const img = showImages ? "data: blob: https: http:" : "data: blob:";
  // script-src 'unsafe-inline' only for the height script the WebView injects; the message
  // itself has no scripts left (removed by the server, and again in prepareHtml).
  return (
    `default-src 'none'; img-src ${img}; style-src 'unsafe-inline'; font-src data:; ` +
    `script-src 'unsafe-inline'`
  );
}

/** Script injected into the WebView: posts the document height whenever it changes. */
export const MEASURE_SCRIPT = `(function () {
  function post() {
    var h = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight);
    window.ReactNativeWebView.postMessage(String(h));
  }
  post();
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.documentElement);
  Array.prototype.forEach.call(document.images, function (img) {
    img.addEventListener("load", post);
    img.addEventListener("error", post);
  });
  setTimeout(post, 300);
})();
true;`;

export type PrepareOptions = {
  /** "Pokaż obrazy" was pressed for this message. */
  showImages: boolean;
  /** Data URIs of inline images by attachment id (fetchInlineImages). */
  inline?: Record<string, string>;
};

/** The complete document the WebView loads for a message. */
export function prepareHtml(html: string, opts: PrepareOptions): string {
  const inline = opts.inline ?? {};
  const body = html
    // Second line of defence; the server's sanitiser already removed them.
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(script|iframe|object|embed|base|meta|link)\b[^>]*>/gi, "")
    .replace(INLINE_URL, (url, id: string) => inline[id] ?? url);
  // Mail is designed for a white page (as Gmail shows it); wide mail scrolls sideways inside
  // the card instead of being shrunk.
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${contentPolicy(opts.showImages)}">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>html,body{margin:0;padding:0;background:#ffffff}` +
    `body{font:14px/1.5 Roboto,Arial,sans-serif;color:#1f1f1f;overflow-wrap:break-word;` +
    `overflow-x:auto}a{color:#0b57d0}img{max-width:100%;height:auto}pre{white-space:pre-wrap}` +
    `</style></head><body>${body}</body></html>`
  );
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 of bytes (no btoa or Buffer needed on Hermes). */
export function toBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += B64[n >> 18]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + B64[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += B64[n >> 18]! + B64[(n >> 12) & 63]! + "==";
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += B64[n >> 18]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + "=";
  }
  return out;
}
