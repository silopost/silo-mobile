import { Link } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { List, SegmentedButtons } from "react-native-paper";
import { t } from "../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { setTheme, useUi, type ThemePreference } from "../state/ui";

const themes: ThemePreference[] = ["light", "system", "dark"];

/** Settings (slice 8 adds the rest): the theme of this device and the signed-in devices. */
export function SettingsScreen() {
  const theme = useAppTheme();
  const preference = useUi((s) => s.theme);
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <List.Section title={t.themeTitle}>
        <SegmentedButtons
          style={styles.themes}
          value={preference}
          onValueChange={(v) => setTheme(v as ThemePreference)}
          buttons={themes.map((value) => ({
            value,
            label: t.themes[value],
            accessibilityLabel: `${t.themeTitle}: ${t.themes[value]}`,
            style: styles.touch,
          }))}
        />
      </List.Section>
      <Link href="/settings/sessions" asChild>
        <List.Item
          title={t.sessionsTitle}
          accessibilityRole="link"
          style={styles.touch}
          left={(props) => <List.Icon {...props} icon="cellphone-link" />}
        />
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 8 },
  themes: { marginHorizontal: 16 },
  touch: { minHeight: MIN_TOUCH, justifyContent: "center" },
});
