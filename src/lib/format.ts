/**
 * Drawer counter as in the Gmail app: the number up to 99, "99+" above. (silo-web prints the full
 * number with Polish grouping; a phone drawer has no room for it.)
 */
export function formatCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

/** First letter of the name, or of the address, upper-cased (avatars). */
export function initial(a: { email: string; name?: string | null }): string {
  return (a.name || a.email).trim().charAt(0).toUpperCase() || "?";
}

const AVATAR_COLORS = ["#1a73e8", "#d93025", "#188038", "#e37400", "#a142f4", "#007b83", "#c5221f"];

/** Background of an avatar, deterministic per address (same palette and hash as silo-web). */
export function avatarColor(email: string): string {
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}
