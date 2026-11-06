/** Path of the search screen with a query (results) or without one, or of a thread found by it. */
export function searchHref(index: number, q?: string, threadId?: string): string {
  const base = `/u/${index}/search${threadId ? `/${threadId}` : ""}`;
  return q ? `${base}?q=${encodeURIComponent(q)}` : base;
}
