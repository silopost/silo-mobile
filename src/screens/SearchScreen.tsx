import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, StyleSheet, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { isApiError } from "../api/errors";
import { keys } from "../api/keys";
import { threadsQuery } from "../api/queries/threads";
import { useAccountIndex, useActiveAccount } from "../features/account";
import { searchHref } from "../features/search/href";
import { SearchChips } from "../features/search/SearchChips";
import { SearchField, type SearchInput } from "../features/search/SearchField";
import { SearchSuggestions } from "../features/search/SearchSuggestions";
import { SelectionBar } from "../features/threadlist/SelectionBar";
import { ThreadList } from "../features/threadlist/ThreadList";
import { Snackbar } from "../features/toasts/Snackbar";
import { useServerFeature } from "../lib/features";
import { t } from "../lib/i18n";
import { INBOX_SLUG } from "../lib/labels";
import { useAppTheme } from "../lib/theme";
import { useSelection } from "../state/selection";

/**
 * Search of the Gmail app (/u/<n>/search?q=): the field in the top bar, recent searches and
 * suggestions while typing, the results of the query as a thread list. The query is sent as `q`
 * as typed; the server parses it, keeps the history and computes the suggestions (plan 2.6, 3.12).
 * A server before 0.4.0 searches the text only: no suggestions.
 */
export function SearchScreen() {
  const { q = "" } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const theme = useAppTheme();
  const index = useAccountIndex();
  const account = useActiveAccount();
  const smart = useServerFeature("search");
  const selecting = useSelection((s) => s.ids.size > 0);
  const input = useRef<SearchInput>(null);
  const [text, setText] = useState(q);
  const [editing, setEditing] = useState(!q);
  const accountId = account?.id;

  // A selection belongs to one result list.
  useEffect(() => {
    const clear = () => useSelection.getState().clear();
    clear();
    return clear;
  }, [q, accountId]);

  const submit = (value = text) => {
    const query = value.trim();
    if (!query) return;
    Keyboard.dismiss();
    input.current?.blur();
    setText(query);
    setEditing(false);
    router.setParams({ q: query });
    // The server records the query in the history when it searches it (GET /threads?q=).
    if (accountId) void qc.invalidateQueries({ queryKey: keys.searchSuggestAll(accountId) });
  };

  const leave = () =>
    router.canGoBack() ? router.back() : router.navigate(`/u/${index}/${INBOX_SLUG}`);
  /** Back while editing a query whose results are shown returns to them, else leaves search. */
  const back = () => {
    if (editing && q) {
      Keyboard.dismiss();
      input.current?.blur();
      setText(q);
      setEditing(false);
    } else {
      leave();
    }
  };

  // System back while editing a query returns to its results; otherwise the router goes back.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!editing || !q || useSelection.getState().ids.size > 0) return false;
      Keyboard.dismiss();
      input.current?.blur();
      setText(q);
      setEditing(false);
      return true;
    });
    return () => sub.remove();
  }, [editing, q]);

  const threadHref = useCallback((id: string) => searchHref(index, q, id), [index, q]);
  const filter = { q };

  /** A chip changed the query text: search it (or start typing again when nothing is left). */
  const applyChip = (query: string) => {
    if (query.trim()) {
      submit(query);
    } else {
      setText("");
      setEditing(true);
      router.setParams({ q: "" });
    }
  };

  // The same query as the list (shared cache entry): the estimate and the server's notes.
  const results = useInfiniteQuery({
    ...threadsQuery(accountId ?? "", filter),
    enabled: !!accountId && !!q,
  });
  const first = results.data?.pages[0];
  const invalid = isApiError(results.error, 422);
  const showResults = !editing && !!q;
  const indexing = first?.indexing && first.indexing.done < 1 ? first.indexing.done : null;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      {selecting && accountId ? (
        <SelectionBar accountId={accountId} filter={filter} />
      ) : (
        <SearchField
          value={text}
          onChange={setText}
          onSubmit={() => submit()}
          onBack={back}
          onFocus={() => setEditing(true)}
          autoFocus={!q}
          inputRef={input}
        />
      )}
      {invalid && (
        <Text
          variant="bodyMedium"
          accessibilityRole="alert"
          testID="search-invalid"
          style={[styles.invalid, { color: theme.colors.error }]}
        >
          {t.invalidQuery}
        </Text>
      )}
      {smart && accountId && !selecting && (
        <SearchChips accountId={accountId} query={showResults ? q : text} onChange={applyChip} />
      )}
      {showResults && first && smart && (
        <>
          {first.approximate && (
            <Note icon="timer-sand" text={t.approximate} testID="search-approximate" />
          )}
          {indexing !== null && (
            <Note
              icon="database-sync-outline"
              text={t.indexing(Math.floor(indexing * 100))}
              testID="search-indexing"
            />
          )}
        </>
      )}
      {showResults && first && (
        <Text
          variant="labelLarge"
          accessibilityRole="header"
          testID="search-count"
          style={[styles.count, { color: theme.colors.onSurfaceVariant }]}
        >
          {t.resultCount(first.resultSizeEstimate)}
        </Text>
      )}
      <View style={styles.content}>
        {invalid && showResults ? null : editing || !q ? (
          smart && accountId ? (
            <SearchSuggestions
              accountId={accountId}
              text={text}
              onInsert={(value) => {
                setText(value);
                input.current?.focus();
              }}
              onSearch={submit}
            />
          ) : null
        ) : accountId && account ? (
          <ThreadList
            key={`${accountId}/${q}`}
            accountId={accountId}
            filter={filter}
            me={{ email: account.email, name: account.displayName }}
            threadHref={threadHref}
            empty={{ text: t.emptySearch, icon: "magnify" }}
          />
        ) : null}
      </View>
      <Snackbar offset={16} />
    </SafeAreaView>
  );
}

/** A note of the server above the results (approximate results, indexing in progress). */
function Note({ icon, text, testID }: { icon: string; text: string; testID: string }) {
  const theme = useAppTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[styles.note, { backgroundColor: theme.colors.surfaceContainerHigh }]}
    >
      <Icon source={icon} size={20} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={[styles.noteText, { color: theme.colors.onSurface }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
  invalid: { paddingHorizontal: 32, paddingBottom: 8 },
  count: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  noteText: { flex: 1 },
});
