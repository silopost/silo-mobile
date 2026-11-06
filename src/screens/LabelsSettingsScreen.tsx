import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  FAB,
  Icon,
  Portal,
  Switch,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { labelErrorMessage, useDeleteLabel, useUpdateLabel } from "../api/mutations/labels";
import { labelsQuery } from "../api/queries/labels";
import type { Label, UpdateLabelBody } from "../api/types";
import { CreateLabelDialog } from "../features/labels/CreateLabelDialog";
import { LabelDialog, type LabelFields } from "../features/labels/LabelDialog";
import { keywordWarning, useFolderNames } from "../features/labels/keywords";
import { SettingsSnackbar } from "../features/settings/SettingsSnackbar";
import { t } from "../lib/i18n";
import { labelTree } from "../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";

/** The fields that changed, as PATCH /labels/{id} takes them (an empty colour clears it). */
export function labelPatch(label: Label, f: LabelFields): UpdateLabelBody {
  const body: UpdateLabelBody = {};
  if (f.name !== label.name) body.name = f.name;
  const bg = f.color?.bg ?? "";
  if (bg !== (label.colorBg ?? "")) {
    body.colorBg = bg;
    body.colorText = f.color?.text ?? "";
  }
  if (f.parentId !== (label.parentId ?? null)) body.parentId = f.parentId;
  return body;
}

/**
 * "Etykiety" of an account (server 0.4.0, plan 3.7): the user labels as a tree with their colour,
 * counters and the keyword state on the mail server (local_only, partial), a switch for showing
 * them in the drawer, and a dialog to rename, recolour, move or delete one. Every change is one
 * request to the server; the palette is the client's (presentation).
 */
export function LabelsSettingsScreen() {
  const { accountId = "" } = useLocalSearchParams<{ accountId: string }>();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const query = useQuery({ ...labelsQuery(accountId), enabled: !!accountId });
  const all = query.data?.labels ?? [];
  const user = all.filter((l) => l.type === "user");
  const folderNames = useFolderNames(accountId, all);
  const update = useUpdateLabel(accountId);
  const remove = useDeleteLabel(accountId);
  const [editing, setEditing] = useState<Label | null>(null);
  const [removing, setRemoving] = useState<Label | null>(null);
  const [creating, setCreating] = useState(false);
  const muted = theme.colors.onSurfaceVariant;

  const save = (label: Label, f: LabelFields) => {
    const body = labelPatch(label, f);
    if (Object.keys(body).length === 0) return setEditing(null);
    update.mutate({ id: label.id, body }, { onSuccess: () => setEditing(null) });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={labelTree(user)}
        keyExtractor={(x) => x.label.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        ListHeaderComponent={
          <Text variant="bodySmall" style={[styles.hint, { color: muted }]}>
            {t.labelsHint}
          </Text>
        }
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator style={styles.spinner} accessibilityLabel={t.loading} />
          ) : (
            <Text style={[styles.empty, { color: muted }]}>
              {query.isError ? t.genericError : t.labelsEmpty}
            </Text>
          )
        }
        renderItem={({ item: { label: l, depth } }) => {
          const warning = keywordWarning(l, folderNames);
          const shown = l.showInList !== "hide";
          return (
            <View style={styles.row} testID={`label-row-${l.id}`}>
              <TouchableRipple
                onPress={() => setEditing(l)}
                accessibilityRole="button"
                accessibilityLabel={l.name}
                accessibilityHint={t.labelEdit}
                style={[styles.text, { paddingLeft: 16 + depth * 24 }]}
              >
                <View style={styles.line}>
                  <Icon
                    source={l.colorBg ? "circle" : "label-outline"}
                    size={20}
                    color={l.colorBg ?? muted}
                  />
                  <View style={styles.flex}>
                    <Text variant="bodyLarge" numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: muted }}>
                      {t.labelCounts(l.threadsUnread, l.threadsTotal)}
                      {l.showInList === "show_if_unread" ? ` · ${t.labelShowIfUnread}` : ""}
                    </Text>
                    {!!warning && (
                      <View style={styles.line} testID={`label-warning-${l.id}`}>
                        <Icon source="alert-outline" size={16} color={theme.colors.error} />
                        <Text
                          variant="bodySmall"
                          style={[styles.flex, { color: theme.colors.error }]}
                        >
                          {warning}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableRipple>
              <TouchableRipple
                onPress={() =>
                  update.mutate({ id: l.id, body: { showInList: shown ? "hide" : "show" } })
                }
                accessibilityRole="switch"
                accessibilityLabel={`${t.labelShowInList}: ${l.name}`}
                accessibilityState={{ checked: shown }}
                borderless
                style={styles.switch}
              >
                <View importantForAccessibility="no-hide-descendants">
                  <Switch
                    value={shown}
                    onValueChange={(v) =>
                      update.mutate({ id: l.id, body: { showInList: v ? "show" : "hide" } })
                    }
                  />
                </View>
              </TouchableRipple>
            </View>
          );
        }}
      />
      <FAB
        icon="plus"
        label={t.newLabel}
        accessibilityLabel={t.newLabel}
        onPress={() => setCreating(true)}
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
      />
      <SettingsSnackbar />

      <CreateLabelDialog
        visible={creating}
        onDismiss={() => setCreating(false)}
        accountId={accountId}
      />
      {editing && (
        <LabelDialog
          testID="edit-label-dialog"
          title={t.labelEdit}
          label={editing}
          labels={user}
          extended
          submitLabel={t.save}
          busy={update.isPending}
          error={update.isError ? labelErrorMessage(update.error) : null}
          onSubmit={(f) => save(editing, f)}
          onDismiss={() => {
            update.reset();
            setEditing(null);
          }}
          onDelete={() => {
            setRemoving(editing);
            setEditing(null);
          }}
        />
      )}
      {removing && (
        <Portal>
          <Dialog
            visible
            onDismiss={remove.isPending ? undefined : () => setRemoving(null)}
            testID="delete-label-dialog"
          >
            <Dialog.Title>{t.labelDeleteTitle(removing.name)}</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">{t.labelDeleteBody}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setRemoving(null)} contentStyle={styles.touch}>
                {t.cancel}
              </Button>
              <Button
                onPress={() => remove.mutate(removing.id, { onSettled: () => setRemoving(null) })}
                disabled={remove.isPending}
                loading={remove.isPending}
                textColor={theme.colors.error}
                contentStyle={styles.touch}
                testID="delete-label-confirm"
              >
                {t.remove}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { paddingHorizontal: 16, paddingVertical: 12 },
  spinner: { marginTop: 32 },
  empty: { padding: 24, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", minHeight: 64, paddingRight: 8 },
  text: { flex: 1, paddingVertical: 8, paddingRight: 8, justifyContent: "center" },
  line: { flexDirection: "row", alignItems: "center", gap: 12 },
  switch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center" },
  fab: { position: "absolute", right: 16 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
