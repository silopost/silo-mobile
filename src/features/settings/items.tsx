import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  Divider,
  Icon,
  List,
  Portal,
  RadioButton,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type ItemProps = {
  title: string;
  /** The current value or what the entry does, under the title (Material list style). */
  description?: string;
  /** The meaning of the entry; not drawn, as Gmail's settings show no icons. */
  icon?: string;
  /** Drawn before the title (the look of a swipe action). */
  left?: ReactNode;
  onPress?: () => void;
  /** link: opens another screen; button: opens a dialog or acts. */
  role?: "link" | "button";
  disabled?: boolean;
  testID?: string;
} & ListLook;

/**
 * Look of a settings list as in the Gmail app: titles 16 dp from the edge and a line under every
 * entry (general and account settings), or 24 dp and no lines (the main settings list).
 */
type ListLook = {
  /** Start of the title, in dp. */
  indent?: 16 | 24;
  /** A line under the entry. */
  separator?: boolean;
};

const rowStyle = (indent: 16 | 24 = 16) => [
  styles.item,
  // Paper's List.Item puts its content 16 dp in.
  { paddingLeft: indent - 16 },
];

/**
 * The line under an entry: Paper's Divider, as between the sections, and pulled up by its own
 * height so what follows starts on it. A section's Divider after the last entry then lies exactly
 * on this line (one line, not two); the next entry is transparent and leaves it visible.
 */
function RowLine({ separator = true }: { separator?: boolean }) {
  return separator ? <Divider style={styles.line} /> : null;
}

/** An entry of a settings list: title and value below, without an icon (Gmail's settings). */
export function SettingsItem({
  title,
  description,
  left,
  onPress,
  role = "button",
  disabled,
  testID,
  indent,
  separator,
}: ItemProps) {
  const theme = useAppTheme();
  const row = rowStyle(indent);
  return (
    <>
      <List.Item
        title={title}
        description={description}
        descriptionNumberOfLines={3}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole={onPress ? role : "text"}
        accessibilityLabel={description ? `${title}, ${description}` : title}
        accessibilityState={disabled ? { disabled: true } : undefined}
        testID={testID}
        style={[row, disabled && styles.disabled]}
        titleStyle={disabled ? { color: theme.colors.onSurfaceVariant } : undefined}
        left={left ? () => <View style={styles.left}>{left}</View> : undefined}
      />
      <RowLine separator={separator} />
    </>
  );
}

type SwitchProps = {
  title: string;
  /** Shown under the title unless it only names the state (t.on / t.off): the box shows that. */
  description?: string;
  /** The meaning of the entry; not drawn, as Gmail's settings show no icons. */
  icon?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
} & ListLook;

/**
 * An on/off entry as in Gmail's settings: a check box at the right end, the whole row (≥ 48 dp)
 * toggles it. Spoken as a switch (on / off), as the setting is one.
 */
export function SwitchItem({
  title,
  description,
  value,
  onValueChange,
  disabled,
  testID,
  indent,
  separator,
}: SwitchProps) {
  const theme = useAppTheme();
  const row = rowStyle(indent);
  const shown = description === t.on || description === t.off ? undefined : description;
  return (
    <>
      <List.Item
        title={title}
        description={shown}
        descriptionNumberOfLines={3}
        onPress={disabled ? undefined : () => onValueChange(!value)}
        accessibilityRole="switch"
        accessibilityLabel={shown ? `${title}, ${shown}` : title}
        accessibilityState={{ checked: value, disabled: !!disabled }}
        testID={testID}
        style={row}
        right={() => (
          <View style={styles.switch} importantForAccessibility="no-hide-descendants">
            {/* The glyphs of Material's check box, without its animation: the row is the control. */}
            <Icon
              source={value ? "checkbox-marked" : "checkbox-blank-outline"}
              size={24}
              color={
                disabled
                  ? theme.colors.onSurfaceDisabled
                  : value
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
              }
            />
          </View>
        )}
      />
      <RowLine separator={separator} />
    </>
  );
}

export type Choice<T extends string> = {
  value: T;
  label: string;
  description?: string;
  /** Drawn before the label (the look of a swipe action). */
  left?: ReactNode;
};

type ChoiceProps<T extends string> = {
  visible: boolean;
  title: string;
  value: T;
  choices: Choice<T>[];
  onSelect: (value: T) => void;
  onDismiss: () => void;
};

/** A dialog of radio buttons: picking one applies it and closes (Gmail's settings dialogs). */
export function ChoiceDialog<T extends string>({
  visible,
  title,
  value,
  choices,
  onSelect,
  onDismiss,
}: ChoiceProps<T>) {
  const theme = useAppTheme();
  if (!visible) return null;
  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss} testID="choice-dialog">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scroll}>
          <ScrollView>
            <RadioButton.Group value={value} onValueChange={(v) => onSelect(v as T)}>
              {choices.map((c) => (
                <TouchableRipple
                  key={c.value}
                  onPress={() => onSelect(c.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: c.value === value }}
                  accessibilityLabel={c.description ? `${c.label}, ${c.description}` : c.label}
                  testID={`choice-${c.value}`}
                  style={styles.choice}
                >
                  <View style={styles.choiceRow} importantForAccessibility="no-hide-descendants">
                    <RadioButton.Android value={c.value} />
                    {c.left}
                    <View style={styles.choiceText}>
                      <Text variant="bodyLarge">{c.label}</Text>
                      {!!c.description && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {c.description}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableRipple>
              ))}
            </RadioButton.Group>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} contentStyle={styles.touch}>
            {t.cancel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

/** Heading of a group of entries (Material list subheader in the primary colour). */
export function SectionTitle({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <Text
      variant="titleSmall"
      accessibilityRole="header"
      style={[styles.section, { color: theme.colors.primary }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  // 48 dp with one line (with the 6 dp margins of the row inside); the check box 16 dp from
  // the right edge.
  item: { minHeight: MIN_TOUCH, justifyContent: "center", paddingVertical: 6, paddingRight: 8 },
  disabled: { opacity: 0.6 },
  // A 32 dp swipe preview at the title's start; the title follows 16 dp after it.
  left: { justifyContent: "center", marginLeft: 16 },
  // Only the glyph: the whole row is the 48 dp target, a one-line row stays 48 dp high.
  switch: { minWidth: MIN_TOUCH, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 0 },
  choice: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: 16 },
  choiceRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  choiceText: { flex: 1 },
  line: { marginBottom: -StyleSheet.hairlineWidth },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
