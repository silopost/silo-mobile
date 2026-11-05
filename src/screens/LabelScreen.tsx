import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useLabels } from "../api/queries/labels";
import { useActiveAccount } from "../features/account";
import { MailShell } from "../features/shell/MailShell";
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

  return (
    // Gmail names the section above the list everywhere but in the Inbox.
    <MailShell
      title={label === INBOX_SLUG ? undefined : known ? viewName(label, labels) : t.unknownLabel}
    >
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {known ? t.threadListSoon : t.unknownLabel}
        </Text>
      </View>
    </MailShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
