import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Checkbox, TextInput } from "react-native-paper";
import { useCreateLabel } from "../../api/mutations/labels";
import { useLabels } from "../../api/queries/labels";
import type { Label } from "../../api/types";
import { BottomSheet } from "../../components/BottomSheet";
import { t } from "../../lib/i18n";

type Status = "checked" | "unchecked" | "indeterminate";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  accountId: string;
  /** Current labels of each target thread. */
  threads: { id: string; labelIds: string[] }[];
  /** Applies the change of user labels to the target threads (one request, after "OK"); the
   * owner closes the sheet. Without a change "OK" only dismisses it. */
  onApply: (add: string[], remove: string[]) => void;
};

/** Checkbox state of a label: on all, some or none of the threads (as silo-web's popover). */
export function labelStatus(id: string, threads: { labelIds: string[] }[]): Status {
  const count = threads.filter((th) => th.labelIds.includes(id)).length;
  if (count === 0) return "unchecked";
  return count === threads.length ? "checked" : "indeterminate";
}

/**
 * "Etykiety" of the Gmail app as a bottom sheet: user labels with checkboxes (all / some / none
 * of the selected threads have the label), "Nowa etykieta" (POST /labels, the new label comes
 * checked), and Anuluj / OK. Changes are collected and sent in one modify after "OK".
 */
export function LabelsSheet({ visible, onDismiss, ...props }: Props) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title={t.labels} testID="labels-sheet">
      {/* Remounted on each opening: the checkboxes start from the threads' labels. */}
      {visible && <LabelsContent onDismiss={onDismiss} {...props} />}
    </BottomSheet>
  );
}

function LabelsContent({ onDismiss, accountId, threads, onApply }: Omit<Props, "visible">) {
  const listed = useLabels(accountId).filter((l) => l.type === "user");
  // Labels created here show before the refetched list has them.
  const [created, setCreated] = useState<Label[]>([]);
  const [changed, setChanged] = useState<Record<string, Status>>({});
  const [name, setName] = useState("");
  const create = useCreateLabel(accountId, (label) => {
    setName("");
    setCreated((c) => [...c, label]);
    setChanged((c) => ({ ...c, [label.id]: "checked" }));
  });

  const labels = [...listed, ...created.filter((c) => !listed.some((l) => l.id === c.id))];
  const initial = (id: string) => labelStatus(id, threads);
  const status = (id: string) => changed[id] ?? initial(id);
  const toggle = (id: string) =>
    setChanged((c) => ({ ...c, [id]: status(id) === "checked" ? "unchecked" : "checked" }));

  const apply = () => {
    const add = labels
      .filter((l) => status(l.id) === "checked" && initial(l.id) !== "checked")
      .map((l) => l.id);
    const remove = labels
      .filter((l) => status(l.id) === "unchecked" && initial(l.id) !== "unchecked")
      .map((l) => l.id);
    if (add.length > 0 || remove.length > 0) onApply(add, remove);
    else onDismiss();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed && !create.isPending) create.mutate(trimmed);
  };

  return (
    <View>
      {labels.map((l) => (
        <Checkbox.Item
          key={l.id}
          label={l.name}
          status={status(l.id)}
          // Paper exposes only checked/unchecked; the mixed state is said in the label.
          accessibilityLabel={status(l.id) === "indeterminate" ? t.labelOnSome(l.name) : l.name}
          onPress={() => toggle(l.id)}
          position="leading"
          labelStyle={styles.label}
          testID={`label-${l.id}`}
        />
      ))}
      <View style={styles.create}>
        <TextInput
          mode="outlined"
          dense
          label={t.newLabel}
          accessibilityLabel={t.newLabel}
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          style={styles.input}
        />
        <Button onPress={submit} disabled={!name.trim() || create.isPending}>
          {t.create}
        </Button>
      </View>
      <View style={styles.actions}>
        <Button onPress={onDismiss}>{t.cancel}</Button>
        <Button mode="contained" onPress={apply}>
          {t.ok}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { textAlign: "left" },
  create: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 },
  input: { flex: 1 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
