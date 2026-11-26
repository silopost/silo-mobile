import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { sortedAccounts, useSession } from "../features/account";
import { SettingsItem } from "../features/settings/items";
import { t } from "../lib/i18n";
import { useAppTheme } from "../lib/theme";

/**
 * Settings as the Gmail app lists them: plain text entries 24 dp from the edge, without icons or
 * lines: "Ustawienia ogólne", one entry per account (by Account.position), then "Dodaj konto" and
 * "O aplikacji".
 */
export function SettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const accounts = sortedAccounts(useSession());
  const look = { indent: 24, separator: false } as const;
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <SettingsItem
        {...look}
        title={t.generalSettings}
        role="link"
        testID="settings-general"
        onPress={() => router.push("/settings/general")}
      />
      {accounts.map((a) => (
        <SettingsItem
          {...look}
          key={a.id}
          title={a.email}
          role="link"
          testID={`settings-account-${a.id}`}
          onPress={() => router.push(`/settings/account/${a.id}`)}
        />
      ))}
      <SettingsItem
        {...look}
        title={t.addAccount}
        role="link"
        testID="settings-add-account"
        onPress={() => router.push("/settings/add-account")}
      />
      <SettingsItem
        {...look}
        title={t.aboutApp}
        role="link"
        testID="settings-about"
        onPress={() => router.push("/settings/about")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 8 },
});
