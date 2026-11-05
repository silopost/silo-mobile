import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { t } from "../lib/i18n";
import { useAppTheme } from "../lib/theme";

function Placeholder({ text }: { text: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        {text}
      </Text>
    </View>
  );
}

/** A thread opened from a list (slice 6). */
export function ThreadScreen() {
  return <Placeholder text={t.threadSoon} />;
}

/** Search results (a later slice). */
export function SearchScreen() {
  return <Placeholder text={t.searchSoon} />;
}

/** Full-screen compose (slice 7). */
export function ComposeScreen() {
  return <Placeholder text={t.composeSoon} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
