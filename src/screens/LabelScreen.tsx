import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useLabels } from "../api/queries/labels";
import { useActiveAccount } from "../features/account";
import { t } from "../lib/i18n";
import { resolveLabelSlug, viewName } from "../lib/labels";
import { useAppTheme } from "../lib/theme";

/** The list of a label (/u/<n>/<label>); the thread list itself comes in slice 3. */
export function LabelScreen() {
  const { label = "" } = useLocalSearchParams<{ label: string }>();
  const account = useActiveAccount();
  const labels = useLabels(account?.id);
  const theme = useAppTheme();
  const known = resolveLabelSlug(label).kind !== "unknown";

  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleMedium" accessibilityRole="header">
        {known ? viewName(label, labels) : t.unknownLabel}
      </Text>
      {known && (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t.threadListSoon}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
});
