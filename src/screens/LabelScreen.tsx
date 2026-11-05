import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLabels } from "../api/queries/labels";
import { useActiveAccount } from "../features/account";
import { MailTopBar } from "../features/topbar/MailTopBar";
import { t } from "../lib/i18n";
import { INBOX_SLUG, resolveLabelSlug, viewName } from "../lib/labels";
import { useAppTheme } from "../lib/theme";

/** The list of a label (/u/<n>/<label>); the thread list itself comes in slice 3. */
export function LabelScreen() {
  const { label = "" } = useLocalSearchParams<{ label: string }>();
  const account = useActiveAccount();
  const labels = useLabels(account?.id);
  const theme = useAppTheme();
  const known = resolveLabelSlug(label).kind !== "unknown";
  const name = known ? viewName(label, labels) : t.unknownLabel;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <MailTopBar />
      {/* Gmail names the section above the list everywhere but in the Inbox. */}
      {label !== INBOX_SLUG && (
        <Text
          variant="labelLarge"
          accessibilityRole="header"
          style={[styles.section, { color: theme.colors.onSurfaceVariant }]}
        >
          {name}
        </Text>
      )}
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {known ? t.threadListSoon : t.unknownLabel}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
