import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Checkbox,
  Dialog,
  Divider,
  HelperText,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { isApiError } from "../api/errors";
import { keys } from "../api/keys";
import {
  applyFilter,
  createFilter,
  deleteFilter,
  filterBody,
  replaceFilter,
  useFilters,
} from "../api/queries/filters";
import { useLabels } from "../api/queries/labels";
import type { Filter, FilterBody } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { sortedAccounts, useSession } from "../features/account";
import { searchHref } from "../features/search/href";
import { SearchChips } from "../features/search/SearchChips";
import { SectionTitle, SettingsItem, SwitchItem } from "../features/settings/items";
import { t } from "../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { toast } from "../state/toasts";

const FLAGS = ["archive", "markRead", "star", "important", "trash"] as const;
type Flag = (typeof FLAGS)[number];
const FLAG_ICONS: Record<Flag, string> = {
  archive: "archive-arrow-down-outline",
  markRead: "email-open-outline",
  star: "star-outline",
  important: "label-variant-outline",
  trash: "delete-outline",
};

/**
 * The filter editor (route /settings/filter?accountId=&id=|criteria=): a new filter, a filter of
 * the list (id) or one made from a search (criteria). The criteria are text in the search syntax;
 * the chips only add and remove pieces of it, as in the search (no parser, plan 2.6). The server
 * validates (422 invalid_query, invalid_filter, invalid_label), stores and applies.
 */
export function FilterEditorScreen() {
  const params = useLocalSearchParams<{ accountId: string; id?: string; criteria?: string }>();
  const accountId = params.accountId ?? "";
  const { filters, isPending } = useFilters(accountId);
  const filter = params.id ? filters.find((f) => f.id === params.id) : null;

  if (params.id && !filter) {
    return (
      <View style={styles.center}>
        {isPending ? (
          <ActivityIndicator accessibilityLabel={t.loading} />
        ) : (
          <Text accessibilityRole="alert">{t.genericError}</Text>
        )}
      </View>
    );
  }
  return (
    <FilterForm
      key={filter?.id ?? "new"}
      accountId={accountId}
      filter={filter ?? null}
      initialCriteria={params.criteria ?? ""}
    />
  );
}

type FormProps = { accountId: string; filter: Filter | null; initialCriteria: string };

function FilterForm({ accountId, filter, initialCriteria }: FormProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const qc = useQueryClient();
  const session = useSession();
  const position = sortedAccounts(session).find((a) => a.id === accountId)?.position ?? 0;
  const userLabels = useLabels(accountId).filter((l) => l.type === "user");
  const [name, setName] = useState(filter?.name ?? "");
  const [criteria, setCriteria] = useState(filter?.criteria ?? initialCriteria);
  const [flags, setFlags] = useState<Record<Flag, boolean>>(() => ({
    archive: filter?.actions.archive ?? false,
    markRead: filter?.actions.markRead ?? false,
    star: filter?.actions.star ?? false,
    important: filter?.actions.important ?? false,
    trash: filter?.actions.trash ?? false,
  }));
  const [labelIds, setLabelIds] = useState<string[]>(filter?.actions.addLabelIds ?? []);
  const [forwardTo, setForwardTo] = useState(filter?.actions.forwardTo ?? "");
  const [applyExisting, setApplyExisting] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [labelsSheet, setLabelsSheet] = useState(false);
  const [removing, setRemoving] = useState(false);

  const trimmed = criteria.trim();
  const labelNames = labelIds
    .map((id) => userLabels.find((l) => l.id === id)?.name ?? id)
    .join(", ");
  const refresh = () => qc.invalidateQueries({ queryKey: keys.filters(accountId) });

  const save = async () => {
    setCriteriaError(null);
    setLabelError(null);
    setFormError(null);
    if (!trimmed) {
      setCriteriaError(t.filterNoCriteria);
      return;
    }
    const actions: FilterBody["actions"] = {
      ...flags,
      addLabelIds: labelIds,
      ...(forwardTo.trim() ? { forwardTo: forwardTo.trim() } : {}),
    };
    const body: FilterBody = filter
      ? filterBody(filter, { name: name.trim(), criteria: trimmed, actions })
      : { accountId, name: name.trim(), criteria: trimmed, actions, enabled: true };
    setSaving(true);
    try {
      const saved = filter ? await replaceFilter(filter.id, body) : await createFilter(body);
      void refresh();
      if (applyExisting) {
        const res = await applyFilter(saved.id);
        toast(t.filterApplying(res.matchedEstimate));
      } else {
        toast(t.filterSaved);
      }
      router.back();
    } catch (err) {
      if (isApiError(err, 422) && err.code === "invalid_query")
        setCriteriaError(t.filterInvalidQuery);
      else if (isApiError(err, 422) && err.code === "invalid_label")
        setLabelError(t.filterInvalidLabel);
      else if (isApiError(err, 422)) setFormError(t.filterInvalidFilter);
      else setFormError(t.genericError);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!filter) return;
    setSaving(true);
    try {
      await deleteFilter(filter.id);
      void refresh();
      toast(t.filterRemoved);
      setRemoving(false);
      router.back();
    } catch {
      setRemoving(false);
      setFormError(t.genericError);
    } finally {
      setSaving(false);
    }
  };

  const test = () => {
    if (trimmed) router.push(searchHref(position, trimmed));
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: filter ? t.filterEdit : t.filterCreate,
          headerRight: () => (
            <View style={styles.header}>
              {filter && (
                <Appbar.Action
                  icon="delete-outline"
                  accessibilityLabel={t.remove}
                  onPress={() => setRemoving(true)}
                />
              )}
              <Button
                onPress={() => void save()}
                disabled={saving}
                loading={saving}
                contentStyle={styles.touch}
                testID="filter-save"
              >
                {t.save}
              </Button>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView behavior="height" style={styles.flex}>
        <ScrollView
          style={{ backgroundColor: theme.colors.background }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.block}>
            <TextInput
              mode="outlined"
              label={t.filterName}
              accessibilityLabel={t.filterName}
              value={name}
              onChangeText={setName}
            />
          </View>

          <SectionTitle>{t.filterCriteria}</SectionTitle>
          <View style={styles.block}>
            <TextInput
              mode="outlined"
              label={t.filterCriteria}
              accessibilityLabel={t.filterCriteria}
              placeholder={t.filterCriteriaHint}
              value={criteria}
              onChangeText={setCriteria}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              error={!!criteriaError}
              style={styles.mono}
              testID="filter-criteria"
            />
            {criteriaError ? (
              <HelperText type="error" visible accessibilityRole="alert">
                {criteriaError}
              </HelperText>
            ) : (
              <HelperText type="info" visible>
                {t.filterCriteriaHint}
              </HelperText>
            )}
          </View>
          <SearchChips
            accountId={accountId}
            query={criteria}
            onChange={setCriteria}
            variant="filter"
          />
          <View style={styles.block}>
            <Button
              mode="outlined"
              icon="magnify"
              onPress={test}
              disabled={!trimmed}
              contentStyle={styles.touch}
              style={styles.start}
            >
              {t.filterTest}
            </Button>
          </View>
          <Divider />

          <SectionTitle>{t.filterActionsTitle}</SectionTitle>
          {FLAGS.map((flag) => (
            <SwitchItem
              key={flag}
              title={t.filterActions[flag]}
              icon={FLAG_ICONS[flag]}
              value={flags[flag]}
              onValueChange={(v) => setFlags((f) => ({ ...f, [flag]: v }))}
              testID={`filter-action-${flag}`}
            />
          ))}
          <SettingsItem
            title={t.filterAddLabels}
            description={labelNames || t.filterNoLabels}
            icon="label-outline"
            testID="filter-labels"
            onPress={() => setLabelsSheet(true)}
          />
          {!!labelError && (
            <HelperText type="error" visible accessibilityRole="alert" style={styles.inset}>
              {labelError}
            </HelperText>
          )}
          <View style={styles.block}>
            <TextInput
              mode="outlined"
              label={t.filterForwardTo}
              accessibilityLabel={t.filterForwardTo}
              value={forwardTo}
              onChangeText={setForwardTo}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <HelperText type="info" visible>
              {t.filterForwardHint}
            </HelperText>
          </View>
          <Divider />
          <SwitchItem
            title={t.filterApplyExisting}
            icon="history"
            value={applyExisting}
            onValueChange={setApplyExisting}
            testID="filter-apply-existing"
          />
          {!!formError && (
            <HelperText type="error" visible accessibilityRole="alert" style={styles.inset}>
              {formError}
            </HelperText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {labelsSheet && (
        <BottomSheet
          visible
          onDismiss={() => setLabelsSheet(false)}
          title={t.filterAddLabels}
          testID="filter-labels-sheet"
          footer={
            <View style={styles.footer}>
              <Button onPress={() => setLabelsSheet(false)} contentStyle={styles.touch}>
                {t.close}
              </Button>
            </View>
          }
        >
          {userLabels.map((l) => {
            const checked = labelIds.includes(l.id);
            return (
              <Checkbox.Item
                key={l.id}
                label={l.name}
                status={checked ? "checked" : "unchecked"}
                mode="android"
                accessibilityLabel={l.name}
                onPress={() =>
                  setLabelIds((ids) => (checked ? ids.filter((x) => x !== l.id) : [...ids, l.id]))
                }
              />
            );
          })}
        </BottomSheet>
      )}
      {removing && filter && (
        <Portal>
          <Dialog visible onDismiss={() => setRemoving(false)} testID="filter-remove-dialog">
            <Dialog.Title>{t.filterRemoveTitle}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">{t.filterRemoveBody(filter.name || filter.criteria)}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setRemoving(false)} contentStyle={styles.touch}>
                {t.cancel}
              </Button>
              <Button
                onPress={() => void remove()}
                disabled={saving}
                contentStyle={styles.touch}
                testID="filter-remove-confirm"
              >
                {t.remove}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center" },
  content: { paddingBottom: 48 },
  block: { paddingHorizontal: 16, paddingTop: 8 },
  inset: { paddingHorizontal: 16 },
  mono: { fontFamily: "monospace" },
  start: { alignSelf: "flex-start" },
  footer: { flexDirection: "row", justifyContent: "flex-end", padding: 16 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
