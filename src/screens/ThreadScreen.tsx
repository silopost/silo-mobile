import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Icon, IconButton, Text, TouchableRipple } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isApiError } from "../api/errors";
import { findCachedThread, neighbourInList } from "../api/mutations/cache";
import { modifyMessages } from "../api/mutations/messages";
import { useLabels } from "../api/queries/labels";
import { threadQuery } from "../api/queries/threads";
import type { Label, Message, ThreadDetail } from "../api/types";
import { DropdownMenu, MenuDivider, MenuEntry } from "../components/DropdownMenu";
import { useAccountIndex, useActiveAccount } from "../features/account";
import { composeHref, openReply, replyTarget, type DraftMode } from "../features/compose/actions";
import { undoSend } from "../features/compose/session";
import { PendingIcon } from "../features/sync/PendingIcon";
import { hasManyRecipients, MessageCard } from "../features/thread/MessageCard";
import { useThreadActions, type ThreadAction } from "../features/threadlist/actions";
import { primaryActions, type BarAction } from "../features/threadlist/SelectionBar";
import { CARD_GAP, CARD_INSET, cardShape, STAR_COLOR } from "../features/threadlist/ThreadRow";
import { useServerFeature } from "../lib/features";
import { formatWhen } from "../lib/format";
import { t } from "../lib/i18n";
import { INBOX_SLUG, resolveLabelSlug } from "../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { useUi } from "../state/ui";
import { searchHref } from "../features/search/href";

/** Collapsed read messages, expanded unread ones and the last one (plan 5.2). */
export function initiallyExpanded(messages: Message[]): Set<string> {
  const ids = messages.filter((m) => (m.labelIds ?? []).includes("UNREAD")).map((m) => m.id);
  const last = messages[messages.length - 1];
  if (last) ids.push(last.id);
  return new Set(ids);
}

/** Runs of 3+ collapsed messages between the first and the expanded ones fold into one bar. */
const FOLD_MIN = 3;

/** Actions that take the thread out of the view: the screen returns to the list. */
const LEAVES: ThreadAction[] = [
  "archive",
  "inbox",
  "trash",
  "untrash",
  "spam",
  "notSpam",
  "deleteForever",
  "moveTo",
  "unread",
  "snooze",
  "unsnooze",
];

/**
 * Icons of the bar for the thread's place, with the logic of the selection bar: Trash deletes
 * forever, Spam says "not spam"; a thread out of the Inbox (Archive, a folder) moves to the Inbox
 * instead of archiving.
 */
function barActions(labelIds: string[], viewLabelId: string | undefined): BarAction[] {
  const place = labelIds.includes("TRASH")
    ? "TRASH"
    : labelIds.includes("SPAM")
      ? "SPAM"
      : viewLabelId;
  return primaryActions(place).map((a) =>
    a.action === "archive" && !labelIds.includes("INBOX")
      ? { action: "inbox", icon: "inbox-arrow-down-outline", label: t.moveToInbox }
      : a,
  );
}

/** Chips of the header: the location (Odebrane, Spam, Kosz, a folder) and the user labels. */
function headerChips(
  labelIds: string[],
  labels: Label[],
): { id: string; name: string; label?: Label }[] {
  const chips: { id: string; name: string; label?: Label }[] = [];
  for (const id of labelIds) {
    const named = t.locations[id];
    if (named && id !== "ARCHIVE") {
      chips.push({ id, name: named });
      continue;
    }
    const l = labels.find((x) => x.id === id);
    if (l && (l.type === "user" || l.type === "folder")) chips.push({ id, name: l.name, label: l });
  }
  return chips;
}

/**
 * A thread opened from a list (/u/<n>/<label>/<threadId>) or from search results
 * (/u/<n>/search/<threadId>?q=, `search`), as the Gmail app shows it.
 */
export function ThreadScreen({ search = false }: { search?: boolean }) {
  const {
    label = INBOX_SLUG,
    threadId = "",
    q = "",
  } = useLocalSearchParams<{
    label: string;
    threadId: string;
    q?: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const index = useAccountIndex();
  const account = useActiveAccount();
  const accountId = account?.id;
  const labels = useLabels(accountId);
  const { run } = useThreadActions();
  const [menu, setMenu] = useState(false);
  const snoozeEnabled = useServerFeature("snooze");

  const resolved = resolveLabelSlug(label);
  // Search results are no view of a label: actions there act as in "Wszystkie".
  const viewLabelId = search
    ? undefined
    : resolved.kind === "system"
      ? resolved.view.labelId
      : resolved.kind === "label"
        ? resolved.labelId
        : undefined;
  const listFilter = search ? { q } : { labelId: viewLabelId };
  const listHref = search ? searchHref(index, q) : `/u/${index}/${label}`;
  const threadHref = (id: string) =>
    search ? searchHref(index, q, id) : `/u/${index}/${label}/${id}`;

  const thread = useQuery({
    ...threadQuery(threadId),
    // The row of the list shows the header at once (plan 6.4).
    placeholderData: () => {
      const row = findCachedThread(qc, threadId);
      return row
        ? ({
            id: row.id,
            accountId: row.accountId,
            subject: row.subject,
            labelIds: row.labelIds,
            messages: null,
            outboundId: row.outboundId,
            scheduledAt: row.scheduledAt,
            snoozedUntil: row.snoozedUntil,
          } satisfies ThreadDetail)
        : undefined;
    },
    retry: (count, err) => !isApiError(err, 404) && count < 1,
  });
  const detail = thread.data;
  const messages = detail?.messages ?? [];
  const labelIds = detail?.labelIds ?? [];
  /** The queued message of a scheduled thread (POST /outbound/{id}/cancel). */
  const outboundId = detail?.outboundId;

  const [expandedState, setExpanded] = useState<{ id: string; set: Set<string> } | null>(null);
  const [unfolded, setUnfolded] = useState(false);
  const expanded = expandedState?.id === threadId ? expandedState.set : initiallyExpanded(messages);
  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (!next.delete(id)) next.add(id);
    setExpanded({ id: threadId, set: next });
  };

  const back = () => (router.canGoBack() ? router.back() : router.navigate(listHref));

  // Opening marks the thread read: the server does not do it by itself (plan 5.2). The device
  // preference markReadOnOpen (settings) turns it off.
  const markReadOnOpen = useUi((s) => s.markReadOnOpen);
  const marked = useRef<string | null>(null);
  const unread = labelIds.includes("UNREAD");
  const loaded = thread.isSuccess && !thread.isPlaceholderData;
  useEffect(() => {
    if (!markReadOnOpen || !loaded || !unread || marked.current === threadId) return;
    marked.current = threadId;
    void run("read", [threadId], { silent: true, labelId: viewLabelId });
  }, [markReadOnOpen, loaded, unread, threadId, run, viewLabelId]);

  const act = (action: ThreadAction) => {
    setMenu(false);
    const leaves = LEAVES.includes(action);
    void run(action, [threadId], {
      labelId: viewLabelId,
      after: leaves ? back : undefined,
      // "Cofnij" brings the thread back on screen, as in Gmail ("unread" is not undone there).
      onUndo: leaves && action !== "unread" ? () => router.push(threadHref(threadId)) : undefined,
    });
  };

  const target = replyTarget(messages);
  const reply = (mode: DraftMode, messageId = target?.id) => {
    if (messageId) void openReply(qc, messageId, mode);
  };
  const starMessage = (m: Message, star: boolean) => {
    if (!accountId) return;
    void modifyMessages(qc, {
      accountId,
      threadId,
      ids: [m.id],
      add: star ? ["STARRED"] : [],
      remove: star ? [] : ["STARRED"],
    });
  };
  const unreadFromHere = (i: number) => {
    if (!accountId) return;
    const ids = messages
      .slice(i)
      .filter((m) => !m.draftId && !(m.labelIds ?? []).includes("DRAFT"))
      .map((m) => m.id);
    void modifyMessages(qc, { accountId, threadId, ids, add: ["UNREAD"] });
    back();
  };

  const older = accountId ? neighbourInList(qc, accountId, listFilter, threadId, 1) : undefined;
  const newer = accountId ? neighbourInList(qc, accountId, listFilter, threadId, -1) : undefined;

  const starred = labelIds.includes("STARRED");
  const inTrash = labelIds.includes("TRASH");
  const inSpam = labelIds.includes("SPAM");
  const snoozed = labelIds.includes("SNOOZED");
  const canSnooze = snoozeEnabled && (snoozed || labelIds.includes("INBOX"));
  const chips = headerChips(labelIds, labels);
  const muted = theme.colors.onSurfaceVariant;

  // Fold long runs of collapsed messages after the first one.
  const firstExpanded = messages.findIndex((m, i) => i > 0 && expanded.has(m.id));
  const foldEnd = firstExpanded < 0 ? messages.length - 1 : firstExpanded;
  const fold = !unfolded && foldEnd - 1 >= FOLD_MIN;

  const page = theme.colors.listBackground;
  /** The messages (and the fold bar) of the thread, each drawn as a card. */
  const items: { key: string; node: ReactNode }[] = [];
  messages.forEach((m, i) => {
    if (fold && i >= 1 && i < foldEnd) {
      if (i > 1) return;
      const n = foldEnd - 1;
      items.push({
        key: "fold",
        node: (
          <Pressable
            testID="fold"
            accessibilityRole="button"
            accessibilityLabel={t.folded(n)}
            onPress={() => setUnfolded(true)}
            style={styles.fold}
          >
            <View style={[styles.foldCount, { borderColor: theme.colors.outlineVariant }]}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
                {n}
              </Text>
            </View>
            <View style={[styles.foldLine, { backgroundColor: theme.colors.outlineVariant }]} />
          </Pressable>
        ),
      });
      return;
    }
    items.push({
      key: m.id,
      node: (
        <MessageCard
          message={m}
          expanded={expanded.has(m.id)}
          me={account?.email ?? ""}
          onToggle={() => toggle(m.id)}
          onStar={(star) => starMessage(m, star)}
          onReply={(mode) => reply(mode, m.id)}
          onUnreadFromHere={() => unreadFromHere(i)}
          onOpenDraft={(draftId) => router.push(composeHref(draftId))}
        />
      ),
    });
  });
  const replies: [DraftMode, string, string][] = [
    ["reply", t.reply, "reply"],
    ...(target && hasManyRecipients(target)
      ? ([["replyAll", t.replyAll, "reply-all"]] as [DraftMode, string, string][])
      : []),
    ["forward", t.forward, "share"],
  ];

  const more = (
    <Appbar.Action
      icon="dots-vertical"
      accessibilityLabel={t.moreActions}
      onPress={() => setMenu(true)}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: page }]}>
      <Appbar.Header style={{ backgroundColor: page }}>
        <Appbar.BackAction accessibilityLabel={t.back} onPress={back} />
        <Appbar.Content title="" />
        {detail &&
          barActions(labelIds, viewLabelId).map((a) => (
            <Appbar.Action
              key={a.action}
              icon={a.icon}
              accessibilityLabel={a.label}
              onPress={() => act(a.action)}
            />
          ))}
        {detail && (
          <Appbar.Action
            icon="email-outline"
            accessibilityLabel={t.markUnread}
            onPress={() => act("unread")}
          />
        )}
        {/* Mounted only while open (Paper's Menu hides itself on mount otherwise). */}
        {detail &&
          (menu ? (
            <DropdownMenu onDismiss={() => setMenu(false)} anchor={more}>
              <MenuEntry
                icon="folder-move-outline"
                title={t.moveTo}
                onPress={() => act("moveTo")}
              />
              <MenuEntry
                icon="label-outline"
                title={t.changeLabels}
                onPress={() => act("labels")}
              />
              <MenuEntry
                icon={starred ? "star-off-outline" : "star-outline"}
                title={starred ? t.unstar : t.star}
                onPress={() => act(starred ? "unstar" : "star")}
              />
              {(canSnooze || (snoozeEnabled && snoozed)) && <MenuDivider />}
              {canSnooze && (
                <MenuEntry icon="clock-outline" title={t.snooze} onPress={() => act("snooze")} />
              )}
              {snoozeEnabled && snoozed && (
                <MenuEntry
                  icon="clock-remove-outline"
                  title={t.unsnooze}
                  onPress={() => act("unsnooze")}
                />
              )}
              <MenuDivider />
              {inTrash && (
                <MenuEntry icon="delete-restore" title={t.untrash} onPress={() => act("untrash")} />
              )}
              {inSpam ? (
                <MenuEntry
                  icon="alert-octagon-outline"
                  title={t.notSpam}
                  onPress={() => act("notSpam")}
                />
              ) : (
                !inTrash && (
                  <MenuEntry
                    icon="alert-octagon-outline"
                    title={t.reportSpam}
                    danger
                    onPress={() => act("spam")}
                  />
                )
              )}
            </DropdownMenu>
          ) : (
            more
          ))}
      </Appbar.Header>

      {thread.isError && !detail ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" accessibilityRole="alert" style={{ color: muted }}>
            {isApiError(thread.error, 404) ? t.threadNotFound : t.genericError}
          </Text>
          {!isApiError(thread.error, 404) && (
            <Button onPress={() => void thread.refetch()}>{t.tryAgain}</Button>
          )}
        </View>
      ) : !detail ? (
        <View style={styles.center}>
          <Text variant="bodyMedium" style={{ color: muted }}>
            {t.loading}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.title}>
              <Text
                variant="headlineSmall"
                accessibilityRole="header"
                style={[styles.grow, { color: theme.colors.onSurface }]}
              >
                {detail.subject || t.noSubject}
                {labelIds.includes("IMPORTANT") && (
                  <Text accessibilityLabel={t.important}>
                    {" "}
                    <Icon source="label-variant" size={20} color={STAR_COLOR} />
                  </Text>
                )}
              </Text>
              <IconButton
                icon={starred ? "star" : "star-outline"}
                iconColor={starred ? STAR_COLOR : muted}
                accessibilityLabel={starred ? t.unstar : t.star}
                accessibilityState={{ checked: starred }}
                onPress={() => act(starred ? "unstar" : "star")}
                style={styles.icon48}
              />
            </View>
            {(chips.length > 0 || messages.some((m) => m.pendingSync)) && (
              <View style={styles.chips}>
                {chips.map((c) => (
                  <Text
                    key={c.id}
                    testID={`chip-${c.id}`}
                    variant="labelSmall"
                    style={[
                      styles.chip,
                      {
                        backgroundColor: c.label?.colorBg ?? theme.colors.surfaceVariant,
                        color: c.label?.colorText ?? muted,
                      },
                    ]}
                  >
                    {c.name}
                  </Text>
                ))}
                <PendingIcon pending={messages.some((m) => m.pendingSync)} />
              </View>
            )}
          </View>

          {detail.snoozedUntil && (
            <View
              testID="thread-snoozed"
              style={[styles.note, { backgroundColor: theme.colors.surfaceContainerHigh }]}
            >
              <Icon source="clock-outline" size={20} color={muted} />
              <Text variant="bodyMedium" style={[styles.grow, { color: theme.colors.onSurface }]}>
                {t.snoozedUntil(formatWhen(detail.snoozedUntil))}
              </Text>
            </View>
          )}

          {labelIds.includes("SCHEDULED") && detail.scheduledAt && (
            <View
              testID="thread-scheduled"
              style={[styles.note, { backgroundColor: theme.colors.surfaceContainerHigh }]}
            >
              <Icon source="send-clock-outline" size={20} color={muted} />
              <Text variant="bodyMedium" style={[styles.grow, { color: theme.colors.onSurface }]}>
                {t.scheduledFor(formatWhen(detail.scheduledAt))}
              </Text>
              {outboundId && accountId && (
                <Button
                  onPress={() =>
                    void undoSend(qc, outboundId, accountId, {
                      done: t.sendCancelled,
                      conflict: t.sendInProgress,
                    })
                  }
                  contentStyle={styles.touch}
                >
                  {t.cancelSend}
                </Button>
              )}
            </View>
          )}

          {thread.isPlaceholderData && (
            <Text variant="bodyMedium" style={[styles.pad, { color: muted }]}>
              {t.loading}
            </Text>
          )}

          {items.map((it, i) => (
            <View
              key={it.key}
              style={[
                styles.card,
                cardShape(i === 0, i === items.length - 1, false),
                { backgroundColor: theme.colors.listCard },
              ]}
            >
              {it.node}
            </View>
          ))}

          {(newer || older) && (
            <View style={styles.neighbours}>
              <IconButton
                icon="chevron-up"
                style={styles.icon48}
                accessibilityLabel={t.newerLabel}
                disabled={!newer}
                onPress={() => newer && router.replace(threadHref(newer))}
              />
              <IconButton
                icon="chevron-down"
                style={styles.icon48}
                accessibilityLabel={t.olderLabel}
                disabled={!older}
                onPress={() => older && router.replace(threadHref(older))}
              />
            </View>
          )}
        </ScrollView>
      )}
      {detail && target && (
        <View
          testID="reply-bar"
          style={[styles.replyBar, { backgroundColor: page, paddingBottom: insets.bottom + 8 }]}
        >
          {replies.map(([mode, text, icon]) => (
            <ReplyButton
              key={mode}
              icon={icon}
              text={text}
              compact={replies.length > 2}
              onPress={() => reply(mode)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * A filled pill of the reply bar pinned under the thread, as in the Gmail app (2026). Paper's
 * Button keeps its label on one line, which cuts "Odpowiedz wszystkim" in a third of a phone's
 * width; here the label wraps to a second line (smaller with three pills) inside the 50 dp pill.
 */
function ReplyButton({
  icon,
  text,
  compact,
  onPress,
}: {
  icon: string;
  text: string;
  /** Three pills share the row: the smaller label. */
  compact: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const ink = theme.colors.onReplyButton;
  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      borderless
      rippleColor={theme.colors.onSurfaceVariant}
      style={[styles.replyButton, { backgroundColor: theme.colors.replyButton }]}
    >
      <View style={styles.replyContent}>
        <Icon source={icon} size={20} color={ink} />
        <Text
          variant={compact ? "labelLarge" : "titleMedium"}
          numberOfLines={2}
          style={[styles.replyLabel, { color: ink }]}
        >
          {text}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  content: { paddingBottom: 8 },
  // Subject 16 dp from the edge, its star 48 dp at the edge (Gmail 2026); no line under it.
  header: { paddingLeft: 16, paddingBottom: 12, gap: 8 },
  title: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  icon48: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  card: { marginHorizontal: CARD_INSET, marginBottom: CARD_GAP, overflow: "hidden" },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
  pad: { paddingHorizontal: 16, paddingVertical: 8 },
  touch: { minHeight: MIN_TOUCH },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  fold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 16,
  },
  foldCount: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  foldLine: { flex: 1, height: StyleSheet.hairlineWidth },
  // Gmail 2026: 50 dp pills, 16 dp from the edges, 8 dp apart.
  replyBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  replyButton: { flex: 1, height: 50, borderRadius: 25, overflow: "hidden" },
  replyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // Tight enough for "Odpowiedz" and "wszystkim" to fit whole beside the icon at 411 dp.
    gap: 6,
    paddingHorizontal: 8,
  },
  replyLabel: { flexShrink: 1, textAlign: "center" },
  neighbours: { flexDirection: "row", justifyContent: "center", paddingTop: 8 },
});
