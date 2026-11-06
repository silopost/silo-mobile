import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Chip,
  FAB,
  IconButton,
  Switch,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { keys } from "../api/keys";
import { filterBody, replaceFilter, useFilters } from "../api/queries/filters";
import { useLabels } from "../api/queries/labels";
import type { Filter, FilterBody, Label } from "../api/types";
import { SettingsSnackbar } from "../features/settings/SettingsSnackbar";
import { t } from "../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { toast } from "../state/toasts";

const FLAGS = ["archive", "markRead", "star", "important", "trash"] as const;

/** The actions of a filter as short chip texts ("Oznacz gwiazdką", "Etykieta: Praca"). */
export function actionChips(f: Filter, labels: Label[]): string[] {
  const a = f.actions;
  return [
    ...FLAGS.filter((flag) => a[flag]).map((flag) => t.filterActions[flag]),
    ...(a.addLabelIds ?? []).map((id) =>
      t.filterSummary.label(labels.find((l) => l.id === id)?.name ?? id),
    ),
    ...(a.forwardTo ? [t.filterSummary.forward(a.forwardTo)] : []),
  ];
}

type FiltersData = { filters: Filter[] | null };

/**
 * "Filtry" of an account (server 0.4.0, plan 3.11): the filters in the order the server evaluates
 * them, each with its criteria, its actions as chips, a switch (PUT of the whole filter with
 * `enabled`) and arrows that move it (PUT with the new `position`; the server shifts the others).
 * A tap opens the editor; the FAB creates one. The server matches and acts; nothing runs here.
 */
export function FiltersScreen() {
  const { accountId = "" } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { filters, isPending, isError, refetch } = useFilters(accountId);
  const labels = useLabels(accountId);

  const put = useMutation({
    mutationFn: ({ f, patch }: { f: Filter; patch: Partial<FilterBody> }) =>
      replaceFilter(f.id, filterBody(f, patch)),
    onMutate: ({ f, patch }) => {
      // The switch flips at once; the order waits for the server (it shifts the others).
      if (patch.enabled === undefined) return;
      qc.setQueryData<FiltersData>(keys.filters(accountId), (d) =>
        d
          ? {
              ...d,
              filters: (d.filters ?? []).map((x) =>
                x.id === f.id ? { ...x, enabled: !!patch.enabled } : x,
              ),
            }
          : d,
      );
    },
    onError: () => toast(t.genericError),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.filters(accountId) }),
  });

  const edit = (f?: Filter) =>
    router.push({
      pathname: "/settings/filter",
      params: f ? { accountId, id: f.id } : { accountId },
    });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filters}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        ListHeaderComponent={
          <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            {t.filtersHint}
          </Text>
        }
        ListEmptyComponent={
          isPending ? (
            <ActivityIndicator style={styles.spinner} accessibilityLabel={t.loading} />
          ) : isError ? (
            <View style={styles.empty}>
              <Text accessibilityRole="alert">{t.genericError}</Text>
              <IconButton icon="refresh" accessibilityLabel={t.retry} onPress={() => refetch()} />
            </View>
          ) : (
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {t.filtersEmpty}
            </Text>
          )
        }
        renderItem={({ item: f, index }) => {
          const title = f.name || f.criteria;
          return (
            <View style={styles.row} testID={`filter-${f.id}`}>
              <TouchableRipple
                onPress={() => edit(f)}
                accessibilityRole="button"
                accessibilityHint={t.filterEdit}
                style={styles.text}
              >
                <View>
                  {!!f.name && (
                    <Text variant="titleSmall" numberOfLines={1}>
                      {f.name}
                    </Text>
                  )}
                  <Text
                    variant="bodyMedium"
                    numberOfLines={2}
                    style={[
                      styles.mono,
                      f.name ? { color: theme.colors.onSurfaceVariant } : undefined,
                    ]}
                  >
                    {f.criteria}
                  </Text>
                  <View style={styles.chips}>
                    {!f.enabled && (
                      <Chip compact icon="pause" accessibilityRole="text">
                        {t.filterDisabled}
                      </Chip>
                    )}
                    {actionChips(f, labels).map((c) => (
                      <Chip key={c} compact accessibilityRole="text">
                        {c}
                      </Chip>
                    ))}
                  </View>
                </View>
              </TouchableRipple>
              <TouchableRipple
                onPress={() => put.mutate({ f, patch: { enabled: !f.enabled } })}
                accessibilityRole="switch"
                accessibilityLabel={t.filterEnabled(title)}
                accessibilityState={{ checked: f.enabled }}
                testID={`filter-enabled-${f.id}`}
                borderless
                style={styles.switch}
              >
                <View importantForAccessibility="no-hide-descendants">
                  <Switch
                    value={f.enabled}
                    onValueChange={(enabled) => put.mutate({ f, patch: { enabled } })}
                  />
                </View>
              </TouchableRipple>
              <View>
                <IconButton
                  icon="arrow-up"
                  size={20}
                  disabled={index === 0 || put.isPending}
                  accessibilityLabel={t.filterMoveUp(title)}
                  onPress={() => put.mutate({ f, patch: { position: f.position - 1 } })}
                />
                <IconButton
                  icon="arrow-down"
                  size={20}
                  disabled={index === filters.length - 1 || put.isPending}
                  accessibilityLabel={t.filterMoveDown(title)}
                  onPress={() => put.mutate({ f, patch: { position: f.position + 1 } })}
                />
              </View>
            </View>
          );
        }}
      />
      <FAB
        icon="plus"
        label={t.filterCreate}
        accessibilityLabel={t.filterCreate}
        onPress={() => edit()}
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        testID="filter-create"
      />
      <SettingsSnackbar />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { paddingHorizontal: 16, paddingVertical: 12 },
  spinner: { marginTop: 32 },
  empty: { padding: 24, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 4, paddingRight: 4, minHeight: 72 },
  text: { flex: 1, paddingLeft: 16, paddingVertical: 8, justifyContent: "center" },
  mono: { fontFamily: "monospace" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  switch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center" },
  fab: { position: "absolute", right: 16 },
});
