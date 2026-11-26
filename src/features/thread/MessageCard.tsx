import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import type { Address, CreateDraftBody, Message } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { DropdownMenu, MenuDivider, MenuEntry } from "../../components/DropdownMenu";
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

/** Avatar of a message, as in the Gmail app (2026). */
const AVATAR = 48;

/** Spoken label of a card: "Jan Kowalski, 4 lis, rozwinięta". */
export function cardLabel(m: Message, expanded: boolean): string {
  return [
    displayName(m.from),
    formatListDate(m.date),
    expanded ? t.expandedState : t.collapsedState,
  ].join(", ");
}

/** Whether "Odpowiedz wszystkim" makes sense: the message went to more than one recipient. */
export function hasManyRecipients(m: Message): boolean {
  return (m.to ?? []).length + (m.cc ?? []).length > 1;
}

/**
 * The details panel of "do mnie ▾" (Od / Do / DW / Data): a frame the full width of the card,
 * labels in one column and the values in a second one that starts after the longest label.
 */
function Details({ message }: { message: Message }) {
  const theme = useAppTheme();
  const [labelWidth, setLabelWidth] = useState(0);
  const muted = theme.colors.onSurfaceVariant;
  const row = (label: string, value: string) => (
    <View key={label} style={styles.detail}>
      <Text
        variant="bodyMedium"
        onLayout={(e) => {
          const w = Math.ceil(e.nativeEvent.layout.width);
          setLabelWidth((old) => Math.max(old, w));
        }}
        style={[styles.detailKey, { color: muted, minWidth: labelWidth }]}
      >
        {label}
      </Text>
      <Text variant="bodyMedium" style={[styles.grow, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
  return (
    <View
      testID={`details-${message.id}`}
      style={[styles.details, { backgroundColor: theme.colors.listBackground }]}
    >
      {row(t.from, `${displayName(message.from)} • ${message.from.email}`)}
      {row(t.toLabel, emails(message.to))}
      {(message.cc ?? []).length > 0 && row(t.cc, emails(message.cc))}
      {row(t.date, formatFullDate(message.date))}
    </View>
  );
}

/**
 * One message of a thread as in the Gmail app (2026), the content of a card of the thread
 * (ThreadScreen draws the card): collapsed to avatar, sender, snippet and date, or expanded with
 * the header ("do mnie ▾", star, reply, ⋮), the details panel, the HTML body and the attachments.
 * A draft is a row that opens it in compose.
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
  const [details, setDetails] = useState(false);
  const muted = theme.colors.onSurfaceVariant;
  const ink = theme.colors.onSurface;
  const ripple = { color: theme.colors.surfaceVariant };

  const draftId = m.draftId;
  if (draftId || labelIds.includes("DRAFT")) {
    return (
      <Pressable
        testID={`draft-${m.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${t.draftLabel}, ${m.snippet}`}
        onPress={() => draftId && p.onOpenDraft(draftId)}
        android_ripple={ripple}
        style={styles.collapsed}
      >
        <Avatar address={m.from} size={AVATAR} />
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

  // Silo keeps a star per message (Gmail has it in the ⋮ menu only).
  const star = (
    <IconButton
      icon={starred ? "star" : "star-outline"}
      size={24}
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
        android_ripple={ripple}
        style={styles.collapsed}
      >
        <Avatar address={m.from} size={AVATAR} />
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
      size={24}
      accessibilityLabel={t.messageMenu}
      onPress={() => setMenu(true)}
      style={styles.icon}
    />
  );
  const pick = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };
  // The short date beside the name; the full one (a tap on it) on its own line under the name,
  // so the name always keeps its width.
  const date = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatFullDate(m.date)}
      onPress={() => setFullDate((f) => !f)}
      hitSlop={8}
      style={fullDate ? styles.date : null}
    >
      <Text variant="bodySmall" numberOfLines={fullDate ? undefined : 1} style={{ color: muted }}>
        {fullDate ? formatFullDate(m.date) : formatListDate(m.date)}
      </Text>
    </Pressable>
  );
  const to = m.to ?? [];
  const short =
    to.length === 1 && to[0]!.email.toLowerCase() === p.me.toLowerCase()
      ? t.toMe
      : `${t.to} ${names(to)}`;

  return (
    <View testID={`message-${m.id}`} style={styles.expanded}>
      <View style={styles.header}>
        <Avatar address={m.from} size={AVATAR} />
        <View style={styles.grow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cardLabel(m, true)}
            accessibilityState={{ expanded: true }}
            onPress={p.onToggle}
            style={styles.line}
          >
            <Text numberOfLines={1} variant="bodyLarge" style={[styles.name, { color: ink }]}>
              {displayName(m.from)}
            </Text>
            {!fullDate && date}
          </Pressable>
          {fullDate && date}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${short}. ${t.recipients}`}
            accessibilityState={{ expanded: details }}
            onPress={() => setDetails((o) => !o)}
            hitSlop={8}
            style={styles.recipients}
          >
            <Text numberOfLines={1} variant="bodyMedium" style={{ color: muted }}>
              {short} {details ? "▴" : "▾"}
            </Text>
          </Pressable>
        </View>
        <PendingIcon pending={m.pendingSync} />
        {star}
        {!sending && (
          <IconButton
            icon="reply"
            size={24}
            accessibilityLabel={t.reply}
            onPress={() => p.onReply("reply")}
            style={styles.icon}
          />
        )}
        {menu ? (
          <DropdownMenu onDismiss={() => setMenu(false)} anchor={more}>
            {!sending && (
              <>
                <MenuEntry icon="reply" title={t.reply} onPress={pick(() => p.onReply("reply"))} />
                {hasManyRecipients(m) && (
                  <MenuEntry
                    icon="reply-all"
                    title={t.replyAll}
                    onPress={pick(() => p.onReply("replyAll"))}
                  />
                )}
                <MenuEntry
                  icon="share"
                  title={t.forward}
                  onPress={pick(() => p.onReply("forward"))}
                />
                <MenuDivider />
              </>
            )}
            <MenuEntry
              icon={starred ? "star-off-outline" : "star-outline"}
              title={starred ? t.unstar : t.star}
              onPress={pick(() => p.onStar(!starred))}
            />
            <MenuEntry
              icon="email-outline"
              title={t.unreadFromHere}
              onPress={pick(p.onUnreadFromHere)}
            />
          </DropdownMenu>
        ) : (
          more
        )}
      </View>
      {details && <Details message={m} />}
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
  // Avatar 16 dp from the card's edge, the text 16 dp after it (88 dp from the screen's edge).
  collapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingLeft: 16,
    paddingVertical: 12,
    minHeight: AVATAR + 24,
  },
  expanded: { paddingTop: 12, paddingBottom: 16 },
  // The icons reach the card's right edge, 48 dp each, as in Gmail.
  header: { flexDirection: "row", alignItems: "flex-start", gap: 16, paddingLeft: 16 },
  line: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  name: { flexShrink: 1 },
  // The full date on its own line, under the name.
  date: { alignSelf: "flex-start" },
  grow: { flex: 1, minWidth: 0 },
  bold: { fontWeight: "700" },
  icon: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  recipients: { alignSelf: "flex-start", minHeight: 24, justifyContent: "center" },
  details: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detail: { flexDirection: "row", gap: 16, paddingVertical: 4 },
  detailKey: { alignSelf: "flex-start" },
  badges: { flexDirection: "row", paddingLeft: 80, paddingTop: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 6, overflow: "hidden" },
  body: { paddingHorizontal: 16, paddingTop: 12 },
});
