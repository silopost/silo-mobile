import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Icon, IconButton, Text } from "react-native-paper";
import { keys } from "../../api/keys";
import { deleteSearchHistory, searchSuggestQuery } from "../../api/queries/search";
import type { SearchSuggestion, SearchSuggestions as Suggestions } from "../../api/types";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { toast } from "../../state/toasts";

/** Wait after the last key before asking for suggestions (as silo-web). */
export const SUGGEST_DEBOUNCE_MS = 150;

/** Icon of a suggestion by its kind: clock, contact, label, operator. */
const ICONS: Record<SearchSuggestion["kind"], string> = {
  history: "history",
  contact: "account-circle-outline",
  label: "label-outline",
  operator: "code-tags",
};

type Props = {
  accountId: string;
  /** The text typed so far. */
  text: string;
  /** A suggestion was taken: its `text` replaces the query (the server built it). */
  onInsert: (text: string) => void;
  /** A recent query was tapped: search it at once. */
  onSearch: (text: string) => void;
};

/**
 * What the Gmail app lists under the search field while typing: before any text "Ostatnie
 * wyszukiwania" with "x" and "Wyczyść wszystko"; then recent queries, contacts, labels and
 * operators from GET /search/suggest (all computed by the server).
 */
export function SearchSuggestions({ accountId, text, onInsert, onSearch }: Props) {
  const theme = useAppTheme();
  const qc = useQueryClient();
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);

  const query = useQuery(searchSuggestQuery(accountId, debounced));
  const empty = debounced.trim() === "";
  const all = query.data?.suggestions ?? [];
  const items = empty ? all.filter((s) => s.kind === "history") : all;
  const muted = theme.colors.onSurfaceVariant;

  /** Takes recent queries out of every cached suggestion list, then forgets them on the server. */
  const forget = async (q?: string) => {
    qc.setQueriesData<Suggestions>({ queryKey: keys.searchSuggestAll(accountId) }, (d) =>
      d
        ? {
            ...d,
            suggestions: (d.suggestions ?? []).filter(
              (s) => s.kind !== "history" || (q !== undefined && s.text !== q),
            ),
          }
        : d,
    );
    try {
      await deleteSearchHistory(accountId, q);
    } catch {
      toast(t.genericError);
    }
    void qc.invalidateQueries({ queryKey: keys.searchSuggestAll(accountId) });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" testID="search-suggestions">
      {empty && items.length > 0 && (
        <View style={styles.header}>
          <Text variant="titleSmall" accessibilityRole="header" style={{ color: muted }}>
            {t.recentSearches}
          </Text>
          <Button compact onPress={() => void forget()}>
            {t.clearAllHistory}
          </Button>
        </View>
      )}
      {items.map((s) => (
        <View key={`${s.kind}:${s.text}`} style={styles.row}>
          <Pressable
            testID={`suggestion-${s.text}`}
            accessibilityRole="button"
            accessibilityLabel={`${t.suggestionKinds[s.kind] ?? s.kind}: ${s.label}`}
            onPress={() => (s.kind === "history" ? onSearch(s.text) : onInsert(s.text))}
            android_ripple={{ color: theme.colors.surfaceVariant }}
            style={styles.item}
          >
            <Icon source={ICONS[s.kind] ?? "magnify"} size={24} color={muted} />
            <Text
              variant="bodyLarge"
              numberOfLines={1}
              style={[styles.label, { color: theme.colors.onSurface }]}
            >
              {s.label}
            </Text>
          </Pressable>
          {s.kind === "history" && (
            <IconButton
              icon="close"
              size={20}
              iconColor={muted}
              accessibilityLabel={t.removeFromHistory(s.text)}
              onPress={() => void forget(s.text)}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 4,
  },
  row: { flexDirection: "row", alignItems: "center", paddingRight: 4 },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: 16,
  },
  label: { flex: 1 },
});
