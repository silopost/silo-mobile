import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Icon,
  List,
  Portal,
  RadioButton,
  Text,
  TextInput,
} from "react-native-paper";
import type { Label } from "../../api/types";
import { t } from "../../lib/i18n";
import { LABEL_COLORS } from "../../lib/labelColors";
import { labelTree, subtree } from "../../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

export type LabelFields = {
  name: string;
  /** null: no colour. */
  color: { bg: string; text: string } | null;
  /** null: top level. */
  parentId: string | null;
};

type Props = {
  title: string;
  /** The label being edited; undefined for a new one. */
  label?: Label;
  /** User labels of the account (parents to choose from). */
  labels: Label[];
  /** Colour and parent (server 0.4.0); a name only otherwise. */
  extended: boolean;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (fields: LabelFields) => void;
  onDismiss: () => void;
  /** "Usuń" in the dialog of an existing label. */
  onDelete?: () => void;
  testID?: string;
};

/**
 * The dialog of a user label (new or edited): its name, a colour of the palette (presentation;
 * the server stores the pair) and the label it sits under. Mounted only while open.
 */
export function LabelDialog({
  title,
  label,
  labels,
  extended,
  submitLabel,
  busy,
  error,
  onSubmit,
  onDismiss,
  onDelete,
  testID = "label-dialog",
}: Props) {
  const theme = useAppTheme();
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState<LabelFields["color"]>(
    label?.colorBg ? { bg: label.colorBg, text: label.colorText ?? "#ffffff" } : null,
  );
  const [parentId, setParentId] = useState<string | null>(label?.parentId ?? null);
  const [parents, setParents] = useState(false);
  const excluded = label ? subtree(labels, label.id) : new Set<string>();
  const choices = labelTree(labels.filter((l) => !excluded.has(l.id)));
  const parentName = labels.find((l) => l.id === parentId)?.name;
  const trimmed = name.trim();
  const submit = () => trimmed && !busy && onSubmit({ name: trimmed, color, parentId });

  return (
    <Portal>
      <Dialog visible onDismiss={busy ? undefined : onDismiss} testID={testID}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scroll}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <TextInput
              mode="outlined"
              label={t.labelName}
              accessibilityLabel={t.labelName}
              value={name}
              onChangeText={setName}
              onSubmitEditing={submit}
              autoFocus={!label}
            />
            {extended && (
              <>
                <Text variant="labelLarge">{t.labelColor}</Text>
                <View style={styles.palette} accessibilityRole="radiogroup">
                  <Swatch
                    selected={color === null}
                    label={t.labelNoColor}
                    onPress={() => setColor(null)}
                    bg={theme.colors.surfaceVariant}
                    icon="cancel"
                    iconColor={theme.colors.onSurfaceVariant}
                  />
                  {LABEL_COLORS.map((c, i) => (
                    <Swatch
                      key={c.bg}
                      selected={color?.bg === c.bg}
                      label={t.labelColorChoice(i + 1)}
                      onPress={() => setColor(c)}
                      bg={c.bg}
                      iconColor={c.text}
                      testID={`label-color-${c.bg}`}
                    />
                  ))}
                </View>
                <List.Item
                  title={t.labelParent}
                  description={parentName ?? t.labelNoParent}
                  onPress={() => setParents(!parents)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: parents }}
                  testID="label-parent"
                  left={(p) => <List.Icon {...p} icon="file-tree-outline" />}
                  right={(p) => <List.Icon {...p} icon={parents ? "chevron-up" : "chevron-down"} />}
                />
                {parents && (
                  <RadioButton.Group
                    value={parentId ?? ""}
                    onValueChange={(v) => setParentId(v || null)}
                  >
                    <RadioButton.Item
                      label={t.labelNoParent}
                      value=""
                      mode="android"
                      position="leading"
                      labelStyle={styles.radioLabel}
                    />
                    {choices.map(({ label: l, depth }) => (
                      <RadioButton.Item
                        key={l.id}
                        label={l.name}
                        value={l.id}
                        mode="android"
                        position="leading"
                        style={{ paddingLeft: 16 + depth * 16 }}
                        labelStyle={styles.radioLabel}
                        testID={`label-parent-${l.id}`}
                      />
                    ))}
                  </RadioButton.Group>
                )}
              </>
            )}
            {!!error && (
              <HelperText type="error" visible accessibilityRole="alert">
                {error}
              </HelperText>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          {onDelete && (
            <Button
              onPress={onDelete}
              disabled={busy}
              textColor={theme.colors.error}
              contentStyle={styles.touch}
              style={styles.delete}
              testID={`${testID}-delete`}
            >
              {t.remove}
            </Button>
          )}
          <Button onPress={onDismiss} disabled={busy} contentStyle={styles.touch}>
            {t.cancel}
          </Button>
          <Button
            onPress={submit}
            disabled={!trimmed || busy}
            loading={busy}
            contentStyle={styles.touch}
            testID={`${testID}-submit`}
          >
            {submitLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function Swatch(props: {
  selected: boolean;
  label: string;
  onPress: () => void;
  bg: string;
  icon?: string;
  iconColor: string;
  testID?: string;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="radio"
      accessibilityLabel={props.label}
      accessibilityState={{ checked: props.selected }}
      testID={props.testID}
      style={styles.swatchTouch}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: props.bg },
          props.selected && { borderColor: theme.colors.onSurface, borderWidth: 2 },
        ]}
      >
        {(props.selected || props.icon) && (
          <Icon source={props.selected ? "check" : props.icon!} size={18} color={props.iconColor} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 0, maxHeight: 480 },
  content: { gap: 8, paddingHorizontal: 24, paddingVertical: 8 },
  palette: { flexDirection: "row", flexWrap: "wrap" },
  swatchTouch: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  radioLabel: { textAlign: "left" },
  delete: { marginRight: "auto" },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
