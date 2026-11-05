import type { components } from "../api/schema";

type Label = components["schemas"]["Label"];

/** Icon name of MaterialCommunityIcons (the icon set react-native-paper renders by default). */
export type IconName = string;

export type SystemView = {
  /** Route segment: /u/0/<slug> */
  slug: string;
  /** API label id; undefined = all mail. */
  labelId: string | undefined;
  name: string;
  icon: IconName;
  /** Counter shown in the drawer, as in Gmail. */
  count?: "unread" | "total";
  /** Listed under "Więcej" in silo-web; the mobile drawer shows every view, like Gmail. */
  more?: boolean;
};

/**
 * System labels of plan 5.5 as drawer entries (port of silo-web's lib/labels.ts), in the order of
 * the Gmail app's drawer; Archive (not a Gmail view) comes last.
 */
export const SYSTEM_VIEWS: SystemView[] = [
  { slug: "inbox", labelId: "INBOX", name: "Odebrane", icon: "inbox", count: "unread" },
  { slug: "starred", labelId: "STARRED", name: "Oznaczone gwiazdką", icon: "star-outline" },
  { slug: "snoozed", labelId: "SNOOZED", name: "Odłożone", icon: "clock-outline" },
  { slug: "important", labelId: "IMPORTANT", name: "Ważne", icon: "label-variant-outline" },
  { slug: "sent", labelId: "SENT", name: "Wysłane", icon: "send-outline" },
  {
    slug: "scheduled",
    labelId: "SCHEDULED",
    name: "Zaplanowane",
    icon: "send-clock-outline",
    count: "total",
  },
  {
    slug: "drafts",
    labelId: "DRAFT",
    name: "Wersje robocze",
    icon: "file-outline",
    count: "total",
  },
  {
    slug: "all",
    labelId: undefined,
    name: "Wszystkie",
    icon: "email-multiple-outline",
    more: true,
  },
  {
    slug: "spam",
    labelId: "SPAM",
    name: "Spam",
    icon: "alert-octagon-outline",
    count: "unread",
    more: true,
  },
  { slug: "trash", labelId: "TRASH", name: "Kosz", icon: "delete-outline", more: true },
  { slug: "archive", labelId: "ARCHIVE", name: "Archiwum", icon: "archive-outline", more: true },
];

export const INBOX_SLUG = "inbox";

export type ResolvedLabel =
  { kind: "system"; view: SystemView } | { kind: "label"; labelId: string } | { kind: "unknown" };

/** Maps the [label] route segment to an API label: a system slug or a label id (l_…). */
export function resolveLabelSlug(slug: string): ResolvedLabel {
  const view = SYSTEM_VIEWS.find((v) => v.slug === slug);
  if (view) return { kind: "system", view };
  if (/^l_[0-9a-z]+$/.test(slug)) return { kind: "label", labelId: slug };
  return { kind: "unknown" };
}

/** Display name of a route segment: the view name, the label name, or the segment itself. */
export function viewName(slug: string, labels: Label[]): string {
  const r = resolveLabelSlug(slug);
  if (r.kind === "system") return r.view.name;
  if (r.kind === "label") return labels.find((l) => l.id === r.labelId)?.name ?? slug;
  return slug;
}

/** Counter of a system view in the drawer (unread or total threads of its label), 0 for none. */
export function systemCount(view: SystemView, labels: Label[]): number {
  if (!view.count || !view.labelId) return 0;
  const l = labels.find((x) => x.id === view.labelId);
  if (!l) return 0;
  return view.count === "unread" ? l.threadsUnread : l.threadsTotal;
}

/** Labels listed in the drawer: shown, or shown while they have unread threads (Label.showInList). */
export function isListed(l: Label): boolean {
  return l.showInList === "show" || (l.showInList === "show_if_unread" && l.threadsUnread > 0);
}
