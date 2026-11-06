import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Icon, IconButton, Menu, Text } from "react-native-paper";
import { isApiError } from "../api/errors";
import { findCachedThread, neighbourInList } from "../api/mutations/cache";
import { modifyMessages } from "../api/mutations/messages";
import { useLabels } from "../api/queries/labels";
import { threadQuery } from "../api/queries/threads";
import type { Label, Message, ThreadDetail } from "../api/types";
import { useAccountIndex, useActiveAccount } from "../features/account";
import { composeHref, openReply, replyTarget, type DraftMode } from "../features/compose/actions";
import { PendingIcon } from "../features/sync/PendingIcon";
import { MessageCard } from "../features/thread/MessageCard";
import { useThreadActions, type ThreadAction } from "../features/threadlist/actions";
import { primaryActions, type BarAction } from "../features/threadlist/SelectionBar";
import { STAR_COLOR } from "../features/threadlist/ThreadRow";
import { t } from "../lib/i18n";
import { INBOX_SLUG, resolveLabelSlug } from "../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { useUi } from "../state/ui";

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

/** A thread opened from a list (/u/<n>/<label>/<threadId>), as the Gmail app shows it. */
export function ThreadScreen() {
  const { label = INBOX_SLUG, threadId = "" } = useLocalSearchParams<{
    label: string;
    threadId: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();
  const theme = useAppTheme();
  const index = useAccountIndex();
  const account = useActiveAccount();
  const accountId = account?.id;
  const labels = useLabels(accountId);
  const { run } = useThreadActions();
  const [menu, setMenu] = useState(false);

  const resolved = resolveLabelSlug(label);
  const viewLabelId =
    resolved.kind === "system"
      ? resolved.view.labelId
      : resolved.kind === "label"
        ? resolved.labelId
        : undefined;
  const listHref = `/u/${index}/${label}`;
  const threadHref = (id: string) => `${listHref}/${id}`;

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

  const older = accountId
    ? neighbourInList(qc, accountId, { labelId: viewLabelId }, threadId, 1)
    : undefined;
  const newer = accountId
    ? neighbourInList(qc, accountId, { labelId: viewLabelId }, threadId, -1)
    : undefined;

  const starred = labelIds.includes("STARRED");
  const inTrash = labelIds.includes("TRASH");
  const inSpam = labelIds.includes("SPAM");
  const chips = headerChips(labelIds, labels);
  const muted = theme.colors.onSurfaceVariant;

  // Fold long runs of collapsed messages after the first one.
  const firstExpanded = messages.findIndex((m, i) => i > 0 && expanded.has(m.id));
  const foldEnd = firstExpanded < 0 ? messages.length - 1 : firstExpanded;
  const fold = !unfolded && foldEnd - 1 >= FOLD_MIN;

  const more = (
    <Appbar.Action
      icon="dots-vertical"
      accessibilityLabel={t.moreActions}
      onPress={() => setMenu(true)}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
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
            <Menu visible onDismiss={() => setMenu(false)} anchor={more}>
              <Menu.Item title={t.moveTo} onPress={() => act("moveTo")} />
              <Menu.Item title={t.labels} onPress={() => act("labels")} />
              <Menu.Item
                title={starred ? t.unstar : t.star}
                onPress={() => act(starred ? "unstar" : "star")}
              />
              {inTrash && <Menu.Item title={t.untrash} onPress={() => act("untrash")} />}
              {inSpam ? (
                <Menu.Item title={t.notSpam} onPress={() => act("notSpam")} />
              ) : (
                !inTrash && <Menu.Item title={t.reportSpam} onPress={() => act("spam")} />
              )}
            </Menu>
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
                style={styles.headerStar}
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

          {thread.isPlaceholderData && (
            <Text variant="bodyMedium" style={[styles.pad, { color: muted }]}>
              {t.loading}
            </Text>
          )}

          {messages.map((m, i) => {
            if (fold && i >= 1 && i < foldEnd) {
              if (i > 1) return null;
              const n = foldEnd - 1;
              return (
                <Pressable
                  key="fold"
                  testID="fold"
                  accessibilityRole="button"
                  accessibilityLabel={t.folded(n)}
                  onPress={() => setUnfolded(true)}
                  style={[styles.fold, { borderTopColor: theme.colors.outlineVariant }]}
                >
                  <View style={[styles.foldCount, { borderColor: theme.colors.outlineVariant }]}>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
                      {n}
                    </Text>
                  </View>
                  <View
                    style={[styles.foldLine, { backgroundColor: theme.colors.outlineVariant }]}
                  />
                </Pressable>
              );
            }
            return (
              <MessageCard
                key={m.id}
                message={m}
                expanded={expanded.has(m.id)}
                me={account?.email ?? ""}
                onToggle={() => toggle(m.id)}
                onStar={(star) => starMessage(m, star)}
                onReply={(mode) => reply(mode, m.id)}
                onUnreadFromHere={() => unreadFromHere(i)}
                onOpenDraft={(draftId) => router.push(composeHref(draftId))}
              />
            );
          })}

          {target && (
            <View style={styles.replyBar}>
              {(
                [
                  ["reply", t.reply, "reply"],
                  ["replyAll", t.replyAll, "reply-all"],
                  ["forward", t.forward, "share"],
                ] as const
              ).map(([mode, text, icon]) => (
                <Button
                  key={mode}
                  mode="outlined"
                  icon={icon}
                  compact
                  onPress={() => reply(mode)}
                  style={styles.replyButton}
                  contentStyle={styles.replyContent}
                  labelStyle={styles.replyLabel}
                >
                  {text}
                </Button>
              ))}
            </View>
          )}

          {(newer || older) && (
            <View style={styles.neighbours}>
              <IconButton
                icon="chevron-up"
                accessibilityLabel={t.newerLabel}
                disabled={!newer}
                onPress={() => newer && router.replace(threadHref(newer))}
              />
              <IconButton
                icon="chevron-down"
                accessibilityLabel={t.olderLabel}
                disabled={!older}
                onPress={() => older && router.replace(threadHref(older))}
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  content: { paddingBottom: 32 },
  header: { paddingLeft: 16, paddingRight: 4, paddingBottom: 12, gap: 8 },
  title: { flexDirection: "row", alignItems: "flex-start" },
  grow: { flex: 1, minWidth: 0 },
  headerStar: { margin: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  chip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
  pad: { paddingHorizontal: 16, paddingVertical: 8 },
  fold: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  replyBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  replyButton: { flex: 1, borderRadius: 20 },
  replyContent: { minHeight: MIN_TOUCH },
  replyLabel: { marginHorizontal: 8 },
  neighbours: { flexDirection: "row", justifyContent: "center", paddingTop: 8 },
});
