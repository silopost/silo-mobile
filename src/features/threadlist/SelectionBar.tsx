import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { keys, type ListFilter } from "../../api/keys";
import { DropdownMenu, MenuDivider, MenuEntry } from "../../components/DropdownMenu";
import type { ThreadPage } from "../../api/types";
import { useServerFeature } from "../../lib/features";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { useSelection } from "../../state/selection";
import { useThreadActions, type ThreadAction } from "./actions";
import { isUnread } from "./ThreadRow";

type Props = {
  accountId: string;
  filter: ListFilter;
};

export type BarAction = { action: ThreadAction; icon: string; label: string };

/**
 * The icons of the bar for a view: Trash deletes forever (restoring is in the menu), Spam says
 * "not spam" and deletes forever; elsewhere archive and move to Trash.
 */
export function primaryActions(labelId: string | undefined): BarAction[] {
  if (labelId === "TRASH") {
    return [{ action: "deleteForever", icon: "delete-forever-outline", label: t.deleteForever }];
  }
  if (labelId === "SPAM") {
    return [
      { action: "notSpam", icon: "alert-octagon-outline", label: t.notSpam },
      { action: "deleteForever", icon: "delete-forever-outline", label: t.deleteForever },
    ];
  }
  return [
    { action: "archive", icon: "archive-arrow-down-outline", label: t.archive },
    { action: "trash", icon: "delete-outline", label: t.trash },
  ];
}

/** Views whose threads cannot be snoozed (not in the Inbox, or not threads of mail). */
const NO_SNOOZE = new Set(["TRASH", "SPAM", "DRAFT", "SCHEDULED", "SENT"]);

/**
 * The clock of the bar (server 0.4.0): "Odłóż" where threads can be snoozed, plus "Anuluj
 * odłożenie" in Odłożone.
 */
export function snoozeActions(labelId: string | undefined, enabled: boolean): BarAction[] {
  if (!enabled || (labelId && NO_SNOOZE.has(labelId))) return [];
  const snooze: BarAction = { action: "snooze", icon: "clock-outline", label: t.snooze };
  return labelId === "SNOOZED"
    ? [{ action: "unsnooze", icon: "clock-remove-outline", label: t.unsnooze }, snooze]
    : [snooze];
}

/**
 * The contextual bar of multi-select, in place of the search bar as in the Gmail app (2026): a flat
 * bar on the page background, "Gotowe" (arrow) and the count on the left, archive, delete and
 * read/unread on the right, the rest (snooze among them) in the ⋮ menu. "Zaznacz wszystko" is the
 * row under the bar (ThreadList). The back button ends the selection.
 */
export function SelectionBar({ accountId, filter }: Props) {
  const theme = useAppTheme();
  const qc = useQueryClient();
  const ids = useSelection((s) => s.ids);
  const { run } = useThreadActions();
  const [menu, setMenu] = useState(false);
  const snooze = useServerFeature("snooze");
  const labelId = filter.labelId;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      useSelection.getState().clear();
      return true;
    });
    return () => sub.remove();
  }, []);

  /** Loaded threads of the list (the selection only spans the pages fetched so far). */
  const loaded = () =>
    qc
      .getQueryData<InfiniteData<ThreadPage>>(keys.threads(accountId, filter))
      ?.pages.flatMap((p) => p.threads ?? []) ?? [];
  const selected = loaded().filter((th) => ids.has(th.id));
  const anyUnread = selected.some(isUnread);
  // As in Gmail: "Usuń gwiazdkę" once every selected thread is starred.
  const allStarred =
    selected.length > 0 && selected.every((th) => th.labelIds?.includes("STARRED"));

  const apply = (action: ThreadAction) => {
    setMenu(false);
    const targets = [...ids];
    useSelection.getState().clear();
    void run(action, targets, { labelId });
  };

  const more = (
    <IconButton
      icon="dots-vertical"
      accessibilityLabel={t.moreActions}
      onPress={() => setMenu(true)}
      style={styles.icon}
    />
  );

  const actions: BarAction[] = [
    ...primaryActions(labelId),
    anyUnread
      ? { action: "read", icon: "email-open-outline", label: t.markRead }
      : { action: "unread", icon: "email-outline", label: t.markUnread },
  ];

  return (
    <View testID="selection-bar" style={styles.bar}>
      <IconButton
        icon="arrow-left"
        accessibilityLabel={t.endSelection}
        onPress={() => useSelection.getState().clear()}
        style={styles.icon}
      />
      <Text
        variant="titleMedium"
        accessibilityLabel={t.selectedCount(ids.size)}
        accessibilityLiveRegion="polite"
        style={[styles.count, { color: theme.colors.onSurface }]}
      >
        {ids.size}
      </Text>
      {actions.map((a) => (
        <IconButton
          key={a.action}
          icon={a.icon}
          accessibilityLabel={a.label}
          onPress={() => apply(a.action)}
          style={styles.icon}
        />
      ))}
      {/* Mounted only while open: Paper's Menu runs a hide animation on mount whose end would
          close a menu opened right after the bar appeared. */}
      {menu ? (
        <DropdownMenu onDismiss={() => setMenu(false)} anchor={more}>
          <MenuEntry icon="folder-move-outline" title={t.moveTo} onPress={() => apply("moveTo")} />
          {allStarred ? (
            <MenuEntry icon="star-off-outline" title={t.unstar} onPress={() => apply("unstar")} />
          ) : (
            <MenuEntry icon="star-outline" title={t.star} onPress={() => apply("star")} />
          )}
          <MenuEntry icon="label-outline" title={t.changeLabels} onPress={() => apply("labels")} />
          {/* Snooze moved here from the bar, in its own group as in Gmail 2026. */}
          {snoozeActions(labelId, snooze).length > 0 && <MenuDivider />}
          {snoozeActions(labelId, snooze).map((a) => (
            <MenuEntry
              key={a.action}
              icon={a.icon}
              title={a.label}
              onPress={() => apply(a.action)}
            />
          ))}
          {labelId !== "SPAM" && <MenuDivider />}
          {labelId === "TRASH" && (
            <MenuEntry icon="delete-restore" title={t.untrash} onPress={() => apply("untrash")} />
          )}
          {labelId !== "SPAM" && labelId !== "TRASH" && (
            <MenuEntry
              icon="alert-octagon-outline"
              title={t.reportSpam}
              danger
              onPress={() => apply("spam")}
            />
          )}
        </DropdownMenu>
      ) : (
        more
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Gmail 2026: 48 dp high, centred on the search pill it replaces (MailShell's TOP_BAR_HEIGHT).
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: MIN_TOUCH,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  icon: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  // The count at 72 dp from the edge.
  count: { flex: 1, marginLeft: 20 },
});
