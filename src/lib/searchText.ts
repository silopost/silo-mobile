/**
 * Text helpers of the search field (port of silo-web's lib/searchText.ts, text only). The app has
 * no query parser (plan 2.6, 3.12): the server parses and runs the query sent as `q`. The filter
 * chips only add and remove pieces of text.
 */

/**
 * Splits a query at the spaces outside "quotes" and (brackets) / {braces}:
 * `from:jan "umowa najmu" (a OR b)` → 3 parts. Nothing is interpreted.
 */
export function splitQuery(q: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  let depth = 0;
  for (const ch of q) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "(" || ch === "{")) depth += 1;
    else if (!quoted && (ch === ")" || ch === "}") && depth > 0) depth -= 1;
    if (/\s/.test(ch) && !quoted && depth === 0) {
      if (current) parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/** Whether a part of the query is exactly `part` (e.g. "has:attachment"). */
export function hasPart(q: string, part: string): boolean {
  return splitQuery(q).includes(part);
}

/** Whether a part of the query starts with one of the prefixes (e.g. "from:"). */
export function hasPrefix(q: string, prefixes: string[]): boolean {
  return splitQuery(q).some((p) => prefixes.some((x) => p.startsWith(x)));
}

/** The query without the parts that start with one of the prefixes. */
export function withoutPrefix(q: string, prefixes: string[]): string {
  return splitQuery(q)
    .filter((p) => !prefixes.some((x) => p.startsWith(x)))
    .join(" ");
}

/** The query with `part` added at the end (once). */
export function withPart(q: string, part: string): string {
  const parts = splitQuery(q);
  return (parts.includes(part) ? parts : [...parts, part]).join(" ");
}

/** Adds `part`, or removes it when the query has it (the on/off chips). */
export function togglePart(q: string, part: string): string {
  return hasPart(q, part)
    ? splitQuery(q)
        .filter((p) => p !== part)
        .join(" ")
    : withPart(q, part);
}

/** A value with spaces in quotes, as Gmail writes it: label:"Moje projekty". */
export function quoteValue(value: string): string {
  const v = value.trim().replace(/"/g, "");
  return /\s/.test(v) ? `"${v}"` : v;
}

/** A day in the query syntax: 2026/11/05 (the date of the device's calendar). */
export function dateToQuery(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}
