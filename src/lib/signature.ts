const entities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/**
 * The signature of the settings (HTML, sanitised by the server) as plain text for the mobile text
 * field: line breaks and block ends become new lines, other tags are dropped. Presentation only;
 * formatting made in silo-web's editor is not kept when the signature is saved from here.
 */
export function signatureToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => entities[m] ?? m)
    .replace(/\n+$/, "");
}

/** Plain text typed on the phone as the HTML the server stores (escaped, lines as <br>). */
export function textToSignatureHtml(text: string): string {
  const trimmed = text.replace(/\s+$/, "");
  if (!trimmed) return "";
  return trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .split("\n")
    .join("<br>");
}
