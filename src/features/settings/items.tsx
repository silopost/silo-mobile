import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  List,
  Portal,
  RadioButton,
  Switch,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";

type ItemProps = {
  title: string;
  /** The current value or what the entry does, under the title (Material list style). */
  description?: string;
  icon?: string;
  /** Instead of an icon (an avatar). */
  left?: ReactNode;
  onPress?: () => void;
  /** link: opens another screen; button: opens a dialog or acts. */
  role?: "link" | "button";
  disabled?: boolean;
  testID?: string;
};

/** An entry of a settings list: title, value below, an icon on the left. */
export function SettingsItem({
  title,
  description,
  icon,
  left,
  onPress,
  role = "button",
  disabled,
  testID,
}: ItemProps) {
  const theme = useAppTheme();
  return (
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
      style={[styles.item, disabled && styles.disabled]}
      titleStyle={disabled ? { color: theme.colors.onSurfaceVariant } : undefined}
      left={
        left
          ? () => <View style={styles.left}>{left}</View>
          : icon
            ? (props) => <List.Icon {...props} icon={icon} />
            : undefined
      }
    />
  );
}

type SwitchProps = {
  title: string;
  description?: string;
  icon?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
};

/** An entry with a switch; the whole row (≥ 48 dp) toggles it, as in Android settings. */
export function SwitchItem({
  title,
  description,
  icon,
  value,
  onValueChange,
  disabled,
  testID,
}: SwitchProps) {
  return (
    <List.Item
      title={title}
      description={description}
      descriptionNumberOfLines={3}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      testID={testID}
      style={styles.item}
      left={icon ? (props) => <List.Icon {...props} icon={icon} /> : undefined}
      right={() => (
        <View style={styles.switch} importantForAccessibility="no-hide-descendants">
          <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
        </View>
      )}
    />
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
  item: { minHeight: 56, justifyContent: "center", paddingRight: 16 },
  disabled: { opacity: 0.6 },
  left: { justifyContent: "center", paddingLeft: 16 },
  switch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: "center" },
  scroll: { paddingHorizontal: 0 },
  choice: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: 16 },
  choiceRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  choiceText: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
