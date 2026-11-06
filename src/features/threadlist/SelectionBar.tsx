import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { IconButton, Menu, Text } from "react-native-paper";
import { keys, type ListFilter } from "../../api/keys";
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
 * The contextual bar of multi-select, in place of the search bar as in the Gmail app: close and
 * the count on the left, archive, delete and read/unread on the right, more in the ⋮ menu. The
 * back button ends the selection.
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
    />
  );

  const actions: BarAction[] = [
    ...primaryActions(labelId),
    anyUnread
      ? { action: "read", icon: "email-open-outline", label: t.markRead }
      : { action: "unread", icon: "email-outline", label: t.markUnread },
    ...snoozeActions(labelId, snooze),
  ];

  return (
    <View
      testID="selection-bar"
      style={[styles.bar, { backgroundColor: theme.colors.surfaceContainerHigh }]}
    >
      <IconButton
        icon="close"
        accessibilityLabel={t.endSelection}
        onPress={() => useSelection.getState().clear()}
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
        />
      ))}
      {/* Mounted only while open: Paper's Menu runs a hide animation on mount whose end would
          close a menu opened right after the bar appeared. */}
      {menu ? (
        <Menu visible onDismiss={() => setMenu(false)} anchor={more}>
          <Menu.Item title={t.moveTo} onPress={() => apply("moveTo")} />
          <Menu.Item title={t.labels} onPress={() => apply("labels")} />
          {allStarred ? (
            <Menu.Item title={t.unstar} onPress={() => apply("unstar")} />
          ) : (
            <Menu.Item title={t.star} onPress={() => apply("star")} />
          )}
          {labelId === "TRASH" && <Menu.Item title={t.untrash} onPress={() => apply("untrash")} />}
          {labelId !== "SPAM" && labelId !== "TRASH" && (
            <Menu.Item title={t.reportSpam} onPress={() => apply("spam")} />
          )}
          <Menu.Item
            title={t.selectAll}
            onPress={() => {
              setMenu(false);
              useSelection.getState().selectAll(loaded().map((th) => th.id));
            }}
          />
        </Menu>
      ) : (
        more
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TOUCH + 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 28,
  },
  count: { flex: 1, marginLeft: 4 },
});
