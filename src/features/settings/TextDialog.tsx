import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Dialog, HelperText, Portal, Text, TextInput } from "react-native-paper";
import { t } from "../../lib/i18n";
import { MIN_TOUCH } from "../../lib/theme";

type Props = {
  title: string;
  label: string;
  /** Explanation above the field. */
  description?: string;
  initial?: string;
  /** A password: hidden, never prefilled. */
  secure?: boolean;
  /** Allows saving an empty value (clearing a display name). */
  allowEmpty?: boolean;
  submitLabel?: string;
  busy?: boolean;
  /** A message (and the server's detail) of the last failed submit. */
  error?: { message: string; detail?: string } | null;
  onSubmit: (value: string) => void;
  onDismiss: () => void;
  testID?: string;
};

/** A dialog with one text field (display name, password); mounted only while open. */
export function TextDialog({
  title,
  label,
  description,
  initial = "",
  secure,
  allowEmpty,
  submitLabel = t.save,
  busy,
  error,
  onSubmit,
  onDismiss,
  testID,
}: Props) {
  const [value, setValue] = useState(initial);
  const [hidden, setHidden] = useState(true);
  const empty = value.trim() === "";
  return (
    <Portal>
      <Dialog visible onDismiss={busy ? undefined : onDismiss} testID={testID}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          {!!description && <Text variant="bodyMedium">{description}</Text>}
          <TextInput
            mode="outlined"
            label={label}
            accessibilityLabel={label}
            value={value}
            onChangeText={setValue}
            autoFocus
            autoCapitalize={secure ? "none" : "sentences"}
            autoCorrect={!secure}
            secureTextEntry={secure && hidden}
            autoComplete={secure ? "password" : "off"}
            textContentType={secure ? "password" : undefined}
            onSubmitEditing={() => (allowEmpty || !empty) && !busy && onSubmit(value)}
            right={
              secure ? (
                <TextInput.Icon
                  icon={hidden ? "eye-outline" : "eye-off-outline"}
                  accessibilityLabel={hidden ? t.showPassword : t.hidePassword}
                  onPress={() => setHidden(!hidden)}
                />
              ) : undefined
            }
          />
          {!!error && (
            <HelperText type="error" visible accessibilityRole="alert">
              {error.detail ? `${error.message}\n${error.detail}` : error.message}
            </HelperText>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={busy} contentStyle={styles.touch}>
            {t.cancel}
          </Button>
          <Button
            onPress={() => onSubmit(value)}
            disabled={busy || (!allowEmpty && empty)}
            loading={busy}
            contentStyle={styles.touch}
            testID={testID ? `${testID}-submit` : undefined}
          >
            {submitLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
