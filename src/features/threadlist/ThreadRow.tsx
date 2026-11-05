import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, IconButton, Text } from "react-native-paper";
import type { Label, Thread } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { avatarAddress, formatListDate, participantNames } from "../../lib/format";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";
import { PendingIcon } from "../sync/PendingIcon";
import type { ThreadAction } from "./actions";

/** Gmail's star colour. */
export const STAR_COLOR = "#f4b400";
/** Minimum row heights in dp: three lines with the avatar, or two in the compact density. */
export const ROW_HEIGHT = { default: 72, compact: 56 } as const;

type Props = {
  thread: Thread;
  selected: boolean;
  /** Selection mode: a tap toggles the row instead of opening it. */
  selecting: boolean;
  /** Labels of the account (chips of user labels). */
  labels: Label[];
  /** Label of the view; its chip is not repeated in the rows. */
  viewLabelId: string | undefined;
  /** The account, for the avatar of a thread of the user's own messages. */
  me: { email: string; name?: string | null } | undefined;
  compact: boolean;
  onOpen: (thread: Thread) => void;
  onToggleSelect: (id: string) => void;
  onAction: (action: ThreadAction, id: string) => void;
};

export const isUnread = (th: Thread) =>
  th.unreadCount > 0 || (th.labelIds ?? []).includes("UNREAD");

/** Spoken label of a row: state, senders, subject, date and markers, as in silo-web. */
export function rowLabel(th: Thread, names: string, date: string): string {
  const labelIds = th.labelIds ?? [];
  const parts = [isUnread(th) ? t.unread : null, names, th.subject || t.noSubject, date];
  if (th.hasAttachments) parts.push(t.hasAttachment);
  if (labelIds.includes("SCHEDULED")) parts.push(t.scheduledLabel);
  if (labelIds.includes("STARRED")) parts.push(t.starredLabel);
  if (th.pendingSync) parts.push(t.pendingSync);
  return parts.filter(Boolean).join(", ");
}

/**
 * One row of the list, laid out as in the Gmail app: avatar, senders and date, subject, snippet
 * and the star; unread rows bold on the plain surface, read rows on the tinted one.
 */
export const ThreadRow = memo(function ThreadRow(p: Props) {
  const theme = useAppTheme();
  const th = p.thread;
  const labelIds = th.labelIds ?? [];
  const unread = isUnread(th);
  const starred = labelIds.includes("STARRED");
  const names = participantNames(th.participants ?? [])
    .map((n) => n.name)
    .join(", ");
  const date = formatListDate(th.lastMessageAt);
  const chips = labelIds
    .filter((id) => id !== p.viewLabelId)
    .map((id) => p.labels.find((l) => l.id === id))
    .filter((l): l is Label => l?.type === "user");
  const strong = unread ? styles.bold : styles.normal;
  const muted = theme.colors.onSurfaceVariant;
  const ink = theme.colors.onSurface;
  const background = p.selected
    ? theme.colors.secondaryContainer
    : unread
      ? theme.colors.surface
      : theme.colors.surfaceContainerLow;
  const avatarSize = p.compact ? 32 : 40;

  return (
    <Pressable
      testID={`thread-${th.id}`}
      accessibilityRole="button"
      accessibilityLabel={rowLabel(th, names, date)}
      accessibilityState={{ selected: p.selected }}
      onPress={() => (p.selecting ? p.onToggleSelect(th.id) : p.onOpen(th))}
      onLongPress={() => p.onToggleSelect(th.id)}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      style={[
        styles.row,
        {
          backgroundColor: background,
          minHeight: p.compact ? ROW_HEIGHT.compact : ROW_HEIGHT.default,
          paddingVertical: p.compact ? 8 : 12,
        },
      ]}
    >
      <Pressable
        testID={`thread-avatar-${th.id}`}
        accessibilityRole="checkbox"
        accessibilityLabel={p.selected ? t.deselectThread : t.selectThread}
        accessibilityState={{ checked: p.selected }}
        onPress={() => p.onToggleSelect(th.id)}
        hitSlop={8}
        style={styles.avatar}
      >
        {p.selected ? (
          <View
            style={[
              styles.check,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Icon source="check" size={avatarSize * 0.55} color={theme.colors.onPrimary} />
          </View>
        ) : (
          <Avatar address={avatarAddress(th.participants ?? [], p.me)} size={avatarSize} />
        )}
      </Pressable>

      <View style={styles.text}>
        <View style={styles.line}>
          <Text
            testID={`thread-names-${th.id}`}
            numberOfLines={1}
            variant="bodyLarge"
            style={[styles.grow, strong, { color: ink }]}
          >
            {names}
            {th.messageCount > 1 && (
              <Text style={[styles.normal, { color: muted }]}>{` ${th.messageCount}`}</Text>
            )}
          </Text>
          <PendingIcon pending={th.pendingSync} />
          {th.hasAttachments && <Icon source="paperclip" size={16} color={muted} />}
          <Text variant="labelMedium" style={[strong, { color: unread ? ink : muted }]}>
            {date}
          </Text>
        </View>

        <View style={styles.line}>
          {labelIds.includes("SCHEDULED") && (
            <Icon source="clock-outline" size={16} color={muted} />
          )}
          <Text
            testID={`thread-subject-${th.id}`}
            numberOfLines={1}
            variant="bodyMedium"
            style={[styles.grow, strong, { color: ink }]}
          >
            {th.subject || t.noSubject}
          </Text>
          {p.compact && <Star starred={starred} id={th.id} onAction={p.onAction} />}
        </View>

        {!p.compact && (
          <View style={styles.line}>
            <View style={[styles.grow, styles.line]}>
              {chips.map((l) => (
                <Text
                  key={l.id}
                  numberOfLines={1}
                  variant="labelSmall"
                  style={[
                    styles.chip,
                    {
                      backgroundColor: l.colorBg ?? theme.colors.surfaceVariant,
                      color: l.colorText ?? theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {l.name}
                </Text>
              ))}
              <Text numberOfLines={1} variant="bodyMedium" style={[styles.grow, { color: muted }]}>
                {th.snippet}
              </Text>
            </View>
            <Star starred={starred} id={th.id} onAction={p.onAction} />
          </View>
        )}
      </View>
    </Pressable>
  );
});

type StarProps = {
  starred: boolean;
  id: string;
  onAction: (action: ThreadAction, id: string) => void;
};

/** The star toggle at the right end of a row. */
function Star({ starred, id, onAction }: StarProps) {
  const theme = useAppTheme();
  return (
    <IconButton
      icon={starred ? "star" : "star-outline"}
      size={20}
      iconColor={starred ? STAR_COLOR : theme.colors.onSurfaceVariant}
      accessibilityLabel={starred ? t.unstar : t.star}
      accessibilityState={{ checked: starred }}
      onPress={() => onAction(starred ? "unstar" : "star", id)}
      style={styles.star}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, gap: 12 },
  avatar: { paddingTop: 2 },
  check: { alignItems: "center", justifyContent: "center" },
  text: { flex: 1, minWidth: 0 },
  line: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  bold: { fontWeight: "700" },
  normal: { fontWeight: "400" },
  chip: { borderRadius: 4, paddingHorizontal: 6, overflow: "hidden", maxWidth: 120 },
  // The 48 dp touch target overlaps the row's padding; the visible star stays 20 dp.
  star: { margin: -12, marginLeft: 0 },
});
