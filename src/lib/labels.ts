import type { components } from "../api/schema";
import { t } from "./i18n";

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
  /** Listed under "More" in silo-web; the mobile drawer shows every view, like Gmail. */
  more?: boolean;
};

/**
 * A drawer entry whose name is read from the dictionary of the current language (t.views) on
 * every access. The getter stays out of any object spread: Babel's spread helper copies a getter
 * as the value it returns once, which would freeze the name in the language of the module load.
 */
function view(
  slug: keyof typeof t.views,
  labelId: string | undefined,
  icon: IconName,
  extra: Pick<SystemView, "count" | "more"> = {},
): SystemView {
  const entry = {
    slug,
    labelId,
    icon,
    get name() {
      return t.views[slug];
    },
  };
  return Object.assign(entry, extra);
}

/**
 * System labels of plan 5.5 as drawer entries (port of silo-web's lib/labels.ts), in the order of
 * the Gmail app's drawer; Archive (not a Gmail view) comes last.
 */
export const SYSTEM_VIEWS: SystemView[] = [
  view("inbox", "INBOX", "inbox", { count: "unread" }),
  view("starred", "STARRED", "star-outline"),
  view("snoozed", "SNOOZED", "clock-outline"),
  view("important", "IMPORTANT", "label-variant-outline"),
  view("sent", "SENT", "send-outline"),
  view("scheduled", "SCHEDULED", "send-clock-outline", { count: "total" }),
  view("drafts", "DRAFT", "file-outline", { count: "total" }),
  view("all", undefined, "email-multiple-outline", { more: true }),
  view("spam", "SPAM", "alert-octagon-outline", { count: "unread", more: true }),
  view("trash", "TRASH", "delete-outline", { more: true }),
  view("archive", "ARCHIVE", "archive-outline", { more: true }),
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

/** Labels as a tree by parentId, depth-first, siblings by position then name (silo-web's order). */
export function labelTree(labels: Label[]): { label: Label; depth: number }[] {
  const ids = new Set(labels.map((l) => l.id));
  const children = new Map<string | null, Label[]>();
  for (const l of labels) {
    const parent = l.parentId && ids.has(l.parentId) ? l.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), l]);
  }
  const out: { label: Label; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    const list = [...(children.get(parent) ?? [])].sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
    for (const l of list) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      out.push({ label: l, depth });
      walk(l.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** The label and every label below it: none of them can become its parent (422 invalid_parent). */
export function subtree(labels: Label[], id: string): Set<string> {
  const out = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const l of labels) {
      if (l.parentId && out.has(l.parentId) && !out.has(l.id)) {
        out.add(l.id);
        grew = true;
      }
    }
  }
  return out;
}
