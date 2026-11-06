import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, List, Text } from "react-native-paper";
import { snoozePresetsQuery } from "../../api/queries/snooze";
import type { SnoozePreset } from "../../api/types";
import { BottomSheet } from "../../components/BottomSheet";
import { formatWhen } from "../../lib/format";
import { t } from "../../lib/i18n";
import { pickDateTime } from "../../lib/pickDateTime";
import { useAppTheme } from "../../lib/theme";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** The chosen wake time (RFC 3339): a preset's `until` or the picked date and time. */
  onSelect: (until: string) => void;
};

/** Icons of Gmail's snooze presets. */
const ICONS: Record<SnoozePreset["key"], string> = {
  later_today: "weather-sunset",
  tomorrow: "weather-sunny",
  this_weekend: "sofa-outline",
  next_week: "briefcase-outline",
};

/** Where the custom date picker starts: the next full hour. */
function nextHour(now = new Date()): Date {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/**
 * "Odłóż do…" of the Gmail app as a bottom sheet: the presets of GET /snooze/presets (computed by
 * the server in the user's time zone; the English label is replaced by a Polish one by `key`, the
 * time shown in that zone) and "Wybierz datę i godzinę" (the native date, then time dialog). The
 * server validates the time (422 invalid_snooze) and wakes the thread; no timer runs here.
 */
export function SnoozeSheet({ visible, onDismiss, onSelect }: Props) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      title={t.snoozeTitle}
      testID="snooze-sheet"
    >
      {visible && <SnoozeContent onDismiss={onDismiss} onSelect={onSelect} />}
    </BottomSheet>
  );
}

function SnoozeContent({ onDismiss, onSelect }: Omit<Props, "visible">) {
  const theme = useAppTheme();
  const query = useQuery(snoozePresetsQuery);
  const timeZone = query.data?.timezone;
  const muted = theme.colors.onSurfaceVariant;

  const custom = async () => {
    const picked = await pickDateTime(nextHour(), new Date());
    if (picked) onSelect(picked.toISOString());
    else onDismiss();
  };

  return (
    <View>
      {query.isPending && (
        <ActivityIndicator
          style={styles.pad}
          accessibilityLabel={t.loading}
          color={theme.colors.primary}
        />
      )}
      {query.isError && (
        <View style={styles.error}>
          <Text variant="bodyMedium" accessibilityRole="alert" style={{ color: muted }}>
            {t.genericError}
          </Text>
          <Button onPress={() => void query.refetch()}>{t.tryAgain}</Button>
        </View>
      )}
      {(query.data?.presets ?? []).map((p) => (
        <List.Item
          key={p.key}
          testID={`snooze-${p.key}`}
          title={t.snoozePresets[p.key] ?? p.label}
          description={formatWhen(p.until, { timeZone })}
          left={(props) => <List.Icon {...props} icon={ICONS[p.key] ?? "clock-outline"} />}
          onPress={() => onSelect(p.until)}
        />
      ))}
      <List.Item
        testID="snooze-custom"
        title={t.pickDateTime}
        left={(props) => <List.Icon {...props} icon="calendar-clock" />}
        onPress={() => void custom()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  error: { alignItems: "center", padding: 16, gap: 8 },
});
