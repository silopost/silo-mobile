/**
 * Normalises the address of a Silo instance as typed by the user: adds https:// when no scheme is
 * given, drops a trailing slash and an /api/v1 suffix. Returns null for anything that is not an
 * http(s) URL with a host.
 */
export function normalizeServerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname || /\s/.test(trimmed)) return null;
  if (url.search || url.hash || url.username || url.password) return null;
  const path = url.pathname.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  return `${url.protocol}//${url.host}${path}`;
}
