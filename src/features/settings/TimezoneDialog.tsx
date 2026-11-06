import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Dialog, List, Portal, RadioButton, TextInput } from "react-native-paper";
import { t } from "../../lib/i18n";
import { MIN_TOUCH } from "../../lib/theme";

/** The device's IANA time zone (Hermes and Node both answer it), e.g. "Europe/Warsaw". */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * IANA zones the platform knows (`Intl.supportedValuesOf`), or null where it is missing (older
 * Hermes): then the zone is typed and the server validates it (422 invalid_timezone).
 */
export function knownTimeZones(): string[] | null {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf !== "function") return null;
  try {
    const zones = intl.supportedValuesOf("timeZone");
    return zones.length > 0 ? zones : null;
  } catch {
    return null;
  }
}

/** Rows shown at once: the list of ~400 zones is narrowed by the search field. */
const MAX_ROWS = 40;

type Props = {
  value: string;
  onSelect: (zone: string) => void;
  onDismiss: () => void;
};

/**
 * "Strefa czasowa" (Settings.timezone): "Ustaw strefę urządzenia" first, then the platform's zones
 * with a search field; without a list a text field. Mounted only while open.
 */
export function TimezoneDialog({ value, onSelect, onDismiss }: Props) {
  const device = deviceTimeZone();
  const zones = knownTimeZones();
  const [text, setText] = useState(zones ? "" : value);
  const needle = text.trim().toLowerCase();
  const shown = zones
    ? zones.filter((z) => z.toLowerCase().includes(needle)).slice(0, MAX_ROWS)
    : [];
  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss} testID="timezone-dialog">
        <Dialog.Title>{t.timezoneTitle}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          {device !== value && (
            <Button
              mode="contained-tonal"
              icon="crosshairs-gps"
              onPress={() => onSelect(device)}
              contentStyle={styles.touch}
              testID="timezone-device"
            >
              {t.timezoneDevice(device)}
            </Button>
          )}
          <TextInput
            mode="outlined"
            label={zones ? t.timezoneSearch : t.timezoneTitle}
            accessibilityLabel={zones ? t.timezoneSearch : t.timezoneTitle}
            placeholder={t.timezoneHint}
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => !zones && text.trim() && onSelect(text.trim())}
          />
        </Dialog.Content>
        {zones && (
          <Dialog.ScrollArea style={styles.scroll}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <RadioButton.Group value={value} onValueChange={onSelect}>
                {shown.map((z) => (
                  <List.Item
                    key={z}
                    title={z}
                    onPress={() => onSelect(z)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: z === value }}
                    testID={`timezone-${z}`}
                    left={() => <RadioButton.Android value={z} />}
                  />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
        )}
        <Dialog.Actions>
          <Button onPress={onDismiss} contentStyle={styles.touch}>
            {t.cancel}
          </Button>
          {!zones && (
            <Button
              onPress={() => onSelect(text.trim())}
              disabled={!text.trim()}
              contentStyle={styles.touch}
            >
              {t.save}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  scroll: { maxHeight: 320, paddingHorizontal: 0 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
