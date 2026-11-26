import { AnimatedFlashList, FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Button, Icon, Text } from "react-native-paper";
import { keys, type ListFilter } from "../../api/keys";
import { useLabels } from "../../api/queries/labels";
import { threadsQuery } from "../../api/queries/threads";
import type { Thread } from "../../api/types";
import { useServerFeature } from "../../lib/features";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { TOP_BAR_HEIGHT, useTopBarScroll } from "../shell/topBarScroll";
import { useSelection } from "../../state/selection";
import { useUi } from "../../state/ui";
import { useDensity } from "../../api/queries/settings";
import { swipeActionFor, useThreadActions, type ThreadAction } from "./actions";
import { SwipeableRow } from "./SwipeableRow";
import { ThreadRow } from "./ThreadRow";

/** FlashList accepting a natively driven Animated.event (the library's export loses the props' type). */
const List = AnimatedFlashList as unknown as typeof FlashList;

/** Scroll distance in dp that counts as a direction change for the compose FAB. */
const SCROLL_SLOP = 8;

type Props = {
  accountId: string;
  filter: ListFilter;
  /** The account, for avatars of the user's own threads. */
  me: { email: string; name?: string | null } | undefined;
  /** Route of a thread opened from this list (`/u/<n>/<label>/<id>`). */
  threadHref: (id: string) => string;
  /** Text and icon of the empty view. */
  empty: { text: string; icon: string };
  /** Name of the view above the first row, scrolling with the list (none in search results). */
  title?: string;
  /** Content above the name of the view, scrolling with the list (e.g. sync banners). */
  header?: ReactNode;
  /** Extended compose FAB: at the top of the list and while scrolling up, as in Gmail. */
  onFabExtendedChange?: (extended: boolean) => void;
};

/**
 * Threads of a view (GET /threads) as in the Gmail app: virtualised rows, the next page near the
 * end, pull-to-refresh, swipe actions, multi-select, and the empty, error and loading states.
 */
export function ThreadList({
  accountId,
  filter,
  me,
  threadHref,
  empty,
  title,
  header,
  onFabExtendedChange,
}: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const query = useInfiniteQuery(threadsQuery(accountId, filter));
  const labels = useLabels(accountId);
  const selected = useSelection((s) => s.ids);
  const swipeLeftAction = useUi((s) => s.swipeLeftAction);
  const swipeRightAction = useUi((s) => s.swipeRightAction);
  const density = useDensity();
  const { run } = useThreadActions();
  const snooze = useServerFeature("snooze");
  const [refreshing, setRefreshing] = useState(false);
  const lastY = useRef(0);
  const fabExtended = useRef(true);
  const barScroll = useTopBarScroll();
  // Room for the floating bar of MailShell above the first row.
  const inset = barScroll ? TOP_BAR_HEIGHT : 0;

  const labelId = filter.labelId;
  const threads = useMemo(
    () => query.data?.pages.flatMap((p) => p.threads ?? []) ?? [],
    [query.data],
  );
  const selecting = selected.size > 0;
  const swipe = {
    left: swipeActionFor("left", labelId, { swipeLeftAction, swipeRightAction }, snooze),
    right: swipeActionFor("right", labelId, { swipeLeftAction, swipeRightAction }, snooze),
  };

  const onOpen = useCallback(
    (th: Thread) => {
      // A draft opens in compose, as in Gmail's Drafts view.
      if (labelId === "DRAFT" && th.draftId) {
        router.push({ pathname: "/compose", params: { draftId: th.draftId } });
      } else {
        router.push(threadHref(th.id));
      }
    },
    [labelId, router, threadHref],
  );
  const onToggleSelect = useCallback((id: string) => useSelection.getState().toggle(id), []);
  const onAction = useCallback(
    (action: ThreadAction, id: string) => void run(action, [id], { labelId }),
    [run, labelId],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        query.refetch(),
        qc.refetchQueries({ queryKey: keys.labels(accountId), exact: true }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [query, qc, accountId]);

  const onFabScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      let next = fabExtended.current;
      if (y <= 0) next = true;
      else if (y > lastY.current + SCROLL_SLOP) next = false;
      else if (y < lastY.current - SCROLL_SLOP) next = true;
      else return;
      lastY.current = y;
      if (next !== fabExtended.current) {
        fabExtended.current = next;
        onFabExtendedChange?.(next);
      }
    },
    [onFabExtendedChange],
  );
  // Under MailShell the offset also drives the floating search bar (natively, see MailShell).
  const scrollHandler = useMemo(
    () =>
      barScroll
        ? // Animated.event only stores the listener (it reads refs on scroll events, not in render).
          // eslint-disable-next-line react-hooks/refs
          Animated.event([{ nativeEvent: { contentOffset: { y: barScroll } } }], {
            useNativeDriver: true,
            listener: onFabScroll,
          })
        : onFabScroll,
    [barScroll, onFabScroll],
  );

  if (query.isPending) {
    return (
      <View style={[styles.center, { paddingTop: inset }]}>
        <ActivityIndicator accessibilityLabel={t.loading} color={theme.colors.primary} />
      </View>
    );
  }

  if (query.isError && threads.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: inset }]}>
        <Icon source="cloud-alert-outline" size={64} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="bodyLarge"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {t.listError}
        </Text>
        <Button mode="text" onPress={() => void query.refetch()}>
          {t.tryAgain}
        </Button>
      </View>
    );
  }

  const allSelected = threads.length > 0 && threads.every((th) => selected.has(th.id));

  return (
    <List
      testID="thread-list"
      data={threads}
      keyExtractor={(th) => th.id}
      extraData={selected}
      contentContainerStyle={{ paddingTop: inset }}
      renderItem={({ item, index }) => (
        <SwipeableRow
          left={swipe.left}
          right={swipe.right}
          enabled={!selecting}
          onSwipe={(action) => onAction(action, item.id)}
        >
          <ThreadRow
            thread={item}
            selected={selected.has(item.id)}
            first={index === 0}
            last={index === threads.length - 1}
            selecting={selecting}
            labels={labels}
            viewLabelId={labelId}
            me={me}
            density={density}
            onOpen={onOpen}
            onToggleSelect={onToggleSelect}
            onAction={onAction}
          />
        </SwipeableRow>
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          testID="thread-list-refresh"
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          colors={[theme.colors.primary]}
          progressBackgroundColor={theme.colors.surfaceContainerHigh}
          progressViewOffset={inset}
        />
      }
      ListHeaderComponent={
        <>
          {header}
          {selecting ? (
            <SelectAllRow
              checked={allSelected}
              onPress={() =>
                allSelected
                  ? useSelection.getState().clear()
                  : useSelection.getState().selectAll(threads.map((th) => th.id))
              }
            />
          ) : title ? (
            <Text
              variant="bodyMedium"
              accessibilityRole="header"
              numberOfLines={1}
              style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
            >
              {title}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={styles.empty} testID="thread-list-empty">
          <Icon source={empty.icon} size={96} color={theme.colors.outlineVariant} />
          <Text
            variant="titleMedium"
            style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
          >
            {empty.text}
          </Text>
        </View>
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator accessibilityLabel={t.loadingMore} color={theme.colors.primary} />
          </View>
        ) : query.isFetchNextPageError ? (
          <View style={styles.footer}>
            <Button mode="text" onPress={() => void fetchNextPage()}>
              {t.tryAgain}
            </Button>
          </View>
        ) : (
          // Room below the last row for the compose FAB.
          <View style={styles.fabRoom} />
        )
      }
    />
  );
}

type SelectAllProps = { checked: boolean; onPress: () => void };

/**
 * "Zaznacz wszystko" under the selection bar, in place of the name of the view (Gmail 2026):
 * selects every loaded thread, or clears the selection once all of them are selected.
 */
function SelectAllRow({ checked, onPress }: SelectAllProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      testID="select-all"
      accessibilityRole="checkbox"
      accessibilityLabel={t.selectAll}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.selectAll}
    >
      <Icon
        source={checked ? "checkbox-marked" : "checkbox-blank-outline"}
        size={24}
        color={checked ? theme.colors.primary : theme.colors.onSurfaceVariant}
      />
      <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
        {t.selectAll}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  empty: { alignItems: "center", paddingTop: 96, paddingHorizontal: 24, gap: 16 },
  message: { textAlign: "center" },
  footer: { alignItems: "center", paddingVertical: 16, paddingBottom: 88 },
  fabRoom: { height: 88 },
  // Gmail 2026: a 20 dp line of regular grey text, 18 dp under the bar, 11 dp above the first card.
  title: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 11 },
  // Same height as the title, so the cards do not move when the selection starts.
  selectAll: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 28,
    minHeight: MIN_TOUCH,
    marginBottom: 1,
    paddingLeft: 28,
    paddingRight: 16,
  },
});
