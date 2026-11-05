import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Appbar, Text } from "react-native-paper";
import { useAccountIndex } from "../features/account";
import { t } from "../lib/i18n";
import { INBOX_SLUG } from "../lib/labels";
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

/** Search results (a later slice); back returns to the list it was opened from. */
export function SearchScreen() {
  const router = useRouter();
  const index = useAccountIndex();
  const theme = useAppTheme();
  const back = () =>
    router.canGoBack() ? router.back() : router.navigate(`/u/${index}/${INBOX_SLUG}`);
  return (
    <View style={styles.screen}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={back} />
        <Appbar.Content title={t.searchMail} />
      </Appbar.Header>
      <Placeholder text={t.searchSoon} />
    </View>
  );
}

/** Full-screen compose (slice 7). */
export function ComposeScreen() {
  return <Placeholder text={t.composeSoon} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
