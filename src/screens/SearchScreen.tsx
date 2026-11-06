import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { keys } from "../api/keys";
import { useAccountIndex, useActiveAccount } from "../features/account";
import { searchHref } from "../features/search/href";
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
      <View style={styles.content}>
        {editing || !q ? (
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
});
