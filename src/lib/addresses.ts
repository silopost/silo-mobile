import type { Address } from "../api/types";

/**
 * Whether a token looks like a bare address; used only to split pasted text at whitespace. The
 * app has no validation of its own (plan 2.6): the server refuses addresses (422 invalid_address).
 */
export function looksLikeAddress(email: string): boolean {
  return /^[^\s@<>(),;:"[\]]+@[^\s@<>(),;:"[\]]+$/.test(email);
}

/** One entry: `jan@firma.pl`, `Jan Kowalski <jan@firma.pl>` or `"Kowalski, Jan" <jan@firma.pl>`. */
function parseOne(raw: string): Address | null {
  const s = raw.trim();
  if (!s) return null;
  const m = /^(.*?)\s*<([^<>]*)>$/.exec(s);
  if (m) {
    const name = m[1]!
      .trim()
      .replace(/^"(.*)"$/, "$1")
      .trim();
    return { name, email: m[2]!.trim() };
  }
  return { name: "", email: s.replace(/^mailto:/i, "") };
}

/** Port of silo-web. Splits typed or pasted text into addresses at commas, semicolons and line breaks. */
export function parseAddresses(text: string): Address[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let angle = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "<") angle = true;
    else if (ch === ">") angle = false;
    if (!quoted && !angle && (ch === "," || ch === ";" || ch === "\n")) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  // Whitespace separates bare addresses too ("a@x.pl b@y.pl").
  return parts.flatMap((p) => {
    const trimmed = p.trim();
    if (
      !trimmed.includes("<") &&
      /\s/.test(trimmed) &&
      trimmed.split(/\s+/).every(looksLikeAddress)
    ) {
      return trimmed.split(/\s+/).map((email) => ({ name: "", email }));
    }
    const a = parseOne(trimmed);
    return a ? [a] : [];
  });
}
