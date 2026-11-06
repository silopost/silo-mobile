import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Menu, Text } from "react-native-paper";
import type { Address, CreateDraftBody, Message } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { displayName, formatFullDate, formatListDate } from "../../lib/format";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { PendingIcon } from "../sync/PendingIcon";
import { STAR_COLOR } from "../threadlist/ThreadRow";
import { AttachmentChips } from "./AttachmentChips";
import { MessageHtml } from "./MessageHtml";

export type DraftMode = NonNullable<CreateDraftBody["mode"]>;

type Props = {
  message: Message;
  expanded: boolean;
  /** Address of the account, to say "do mnie". */
  me: string;
  onToggle: () => void;
  onStar: (starred: boolean) => void;
  onReply: (mode: DraftMode) => void;
  onUnreadFromHere: () => void;
  onOpenDraft: (draftId: string) => void;
};

const names = (as: Address[] | null) => (as ?? []).map(displayName).join(", ");
const emails = (as: Address[] | null) => (as ?? []).map((a) => a.email).join(", ");

/** Spoken label of a card: "Jan Kowalski, 4 lis, rozwinięta". */
export function cardLabel(m: Message, expanded: boolean): string {
  return [
    displayName(m.from),
    formatListDate(m.date),
    expanded ? t.expandedState : t.collapsedState,
  ].join(", ");
}

/** "do mnie ▾" and the details panel (Od / Do / DW / Data) of the Gmail app. */
function Recipients({ message, me }: { message: Message; me: string }) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const to = message.to ?? [];
  const short =
    to.length === 1 && to[0]!.email.toLowerCase() === me.toLowerCase()
      ? t.toMe
      : `${t.to} ${names(to)}`;
  const muted = theme.colors.onSurfaceVariant;
  const row = (label: string, value: string) => (
    <View style={styles.detail}>
      <Text variant="bodySmall" style={[styles.detailKey, { color: muted }]}>
        {label}
      </Text>
      <Text variant="bodySmall" style={[styles.grow, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${short}. ${t.recipients}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
        style={styles.recipients}
      >
        <Text numberOfLines={1} variant="bodySmall" style={{ color: muted }}>
          {short} ▾
        </Text>
      </Pressable>
      {open && (
        <View
          testID={`details-${message.id}`}
          style={[styles.details, { borderColor: theme.colors.outlineVariant }]}
        >
          {row(t.from, `${displayName(message.from)} <${message.from.email}>`)}
          {row(t.toLabel, emails(message.to))}
          {(message.cc ?? []).length > 0 && row(t.cc, emails(message.cc))}
          {row(t.date, formatFullDate(message.date))}
        </View>
      )}
    </View>
  );
}

/**
 * One message of a thread as in the Gmail app: collapsed to avatar, sender, snippet and date, or
 * expanded with the header ("do mnie ▾", star, reply, ⋮), the HTML body and the attachments. A
 * draft is a row that opens it in compose.
 */
export function MessageCard(p: Props) {
  const theme = useAppTheme();
  const m = p.message;
  const labelIds = m.labelIds ?? [];
  const sending = labelIds.includes("SCHEDULED");
  const starred = labelIds.includes("STARRED");
  const unread = labelIds.includes("UNREAD");
  const [menu, setMenu] = useState(false);
  const [fullDate, setFullDate] = useState(false);
  const muted = theme.colors.onSurfaceVariant;
  const ink = theme.colors.onSurface;
  const border = { borderTopColor: theme.colors.outlineVariant };

  const draftId = m.draftId;
  if (draftId || labelIds.includes("DRAFT")) {
    return (
      <Pressable
        testID={`draft-${m.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${t.draftLabel}, ${m.snippet}`}
        onPress={() => draftId && p.onOpenDraft(draftId)}
        android_ripple={{ color: theme.colors.surfaceVariant }}
        style={[styles.collapsed, styles.border, border]}
      >
        <Avatar address={m.from} size={40} />
        <View style={styles.grow}>
          <Text variant="labelLarge" style={{ color: theme.colors.error }}>
            {t.draftLabel}
          </Text>
          <Text numberOfLines={1} variant="bodyMedium" style={{ color: muted }}>
            {m.snippet}
          </Text>
        </View>
        <PendingIcon pending={m.pendingSync} />
      </Pressable>
    );
  }

  const star = (
    <IconButton
      icon={starred ? "star" : "star-outline"}
      size={20}
      iconColor={starred ? STAR_COLOR : muted}
      accessibilityLabel={starred ? t.unstar : t.star}
      accessibilityState={{ checked: starred }}
      onPress={() => p.onStar(!starred)}
      style={styles.icon}
    />
  );

  if (!p.expanded) {
    return (
      <Pressable
        testID={`message-${m.id}`}
        accessibilityRole="button"
        accessibilityLabel={cardLabel(m, false)}
        accessibilityState={{ expanded: false }}
        onPress={p.onToggle}
        android_ripple={{ color: theme.colors.surfaceVariant }}
        style={[styles.collapsed, styles.border, border]}
      >
        <Avatar address={m.from} size={40} />
        <View style={styles.grow}>
          <View style={styles.line}>
            <Text
              numberOfLines={1}
              variant="bodyLarge"
              style={[styles.grow, { color: ink }, unread ? styles.bold : null]}
            >
              {displayName(m.from)}
            </Text>
            <PendingIcon pending={m.pendingSync} />
            <Text variant="labelMedium" style={{ color: muted }}>
              {formatListDate(m.date)}
            </Text>
          </View>
          <Text numberOfLines={1} variant="bodyMedium" style={{ color: muted }}>
            {m.snippet}
          </Text>
        </View>
        {star}
      </Pressable>
    );
  }

  const more = (
    <IconButton
      icon="dots-vertical"
      size={20}
      accessibilityLabel={t.messageMenu}
      onPress={() => setMenu(true)}
      style={styles.icon}
    />
  );
  const pick = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  return (
    <View testID={`message-${m.id}`} style={[styles.expanded, styles.border, border]}>
      <View style={styles.header}>
        <Avatar address={m.from} size={40} />
        <View style={styles.grow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cardLabel(m, true)}
            accessibilityState={{ expanded: true }}
            onPress={p.onToggle}
            style={styles.line}
          >
            <Text
              numberOfLines={1}
              variant="bodyLarge"
              style={[styles.shrink, styles.bold, { color: ink }]}
            >
              {displayName(m.from)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={formatFullDate(m.date)}
              onPress={() => setFullDate((f) => !f)}
              hitSlop={8}
            >
              <Text variant="labelMedium" style={{ color: muted }}>
                {fullDate ? formatFullDate(m.date) : formatListDate(m.date)}
              </Text>
            </Pressable>
          </Pressable>
          <Recipients message={m} me={p.me} />
        </View>
        <PendingIcon pending={m.pendingSync} />
        {star}
        {!sending && (
          <IconButton
            icon="reply"
            size={20}
            accessibilityLabel={t.reply}
            onPress={() => p.onReply("reply")}
            style={styles.icon}
          />
        )}
        {/* Mounted only while open (Paper's Menu hides itself on mount otherwise). */}
        {menu ? (
          <Menu visible onDismiss={() => setMenu(false)} anchor={more}>
            {!sending && (
              <>
                <Menu.Item title={t.reply} onPress={pick(() => p.onReply("reply"))} />
                <Menu.Item title={t.replyAll} onPress={pick(() => p.onReply("replyAll"))} />
                <Menu.Item title={t.forward} onPress={pick(() => p.onReply("forward"))} />
              </>
            )}
            <Menu.Item title={t.unreadFromHere} onPress={pick(p.onUnreadFromHere)} />
          </Menu>
        ) : (
          more
        )}
      </View>
      {sending && (
        <View style={styles.badges}>
          <Text
            variant="labelSmall"
            style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant, color: muted }]}
          >
            {t.sendingLabel}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <MessageHtml message={m} />
        <AttachmentChips attachments={m.attachments ?? []} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  border: { borderTopWidth: StyleSheet.hairlineWidth },
  collapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    minHeight: MIN_TOUCH + 16,
  },
  expanded: { paddingVertical: 8 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingLeft: 16 },
  line: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  bold: { fontWeight: "700" },
  icon: { margin: 0 },
  recipients: { alignSelf: "flex-start", minHeight: 24, justifyContent: "center" },
  details: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 4, gap: 2 },
  detail: { flexDirection: "row", gap: 8 },
  detailKey: { width: 40 },
  badges: { flexDirection: "row", paddingLeft: 68, paddingTop: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 6, overflow: "hidden" },
  body: { paddingHorizontal: 16, paddingTop: 8 },
});
