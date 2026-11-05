import { format, isSameDay, isSameYear } from "date-fns";
import { pl } from "date-fns/locale";
import type { Participant } from "../api/types";
import { t } from "./i18n";

/** How the server names the user among the participants of a thread. */
export const ME = "me";

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

/** Number with Polish digit grouping ("12 345"), for banners. */
export function formatNumber(n: number): string {
  return n.toLocaleString("pl-PL");
}

/** List date as in Gmail (plan 6.1): "09:12" today, "4 lis" this year, "04.11.2025" otherwise. */
export function formatListDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isSameDay(d, now)) return format(d, "HH:mm");
  if (isSameYear(d, now)) return format(d, "d MMM", { locale: pl });
  return format(d, "dd.MM.yyyy");
}

/** Name of an address; the server writes the user's own address as "me" ("ja"). */
export function displayName(a: { email: string; name?: string | null }): string {
  if (a.email === ME) return t.me;
  return a.name || a.email;
}

function shortName(p: Participant): string {
  if (p.email === ME) return t.me;
  return p.name ? (p.name.split(/\s+/)[0] ?? p.name) : (p.email.split("@")[0] ?? p.email);
}

/**
 * Senders of a row (port of silo-web): the full name of a single participant, short names of up
 * to three otherwise (the first and the last two of a longer list).
 */
export function participantNames(list: Participant[]): { name: string; unread: boolean }[] {
  if (list.length === 1) {
    const p = list[0]!;
    return [{ name: displayName(p), unread: p.unread }];
  }
  const shown = list.length > 3 ? [list[0]!, ...list.slice(-2)] : list;
  return shown.map((p) => ({ name: shortName(p), unread: p.unread }));
}

/**
 * Whose avatar a row shows, as in the Gmail app: the last participant who is not the user, else
 * the user's account (a thread of the user's own messages).
 */
export function avatarAddress(
  list: Participant[],
  me: { email: string; name?: string | null } | undefined,
): { email: string; name?: string | null } {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]!;
    if (p.email !== ME) return p;
  }
  return me ?? { email: "?", name: "?" };
}
