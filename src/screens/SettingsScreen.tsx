import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { Divider } from "react-native-paper";
import { Avatar } from "../components/Avatar";
import { sortedAccounts, useSession } from "../features/account";
import { SettingsItem } from "../features/settings/items";
import { t } from "../lib/i18n";
import { useAppTheme } from "../lib/theme";

/**
 * Settings as the Gmail app lists them: "Ustawienia ogólne", one entry per account (by
 * Account.position), then "Dodaj konto" and "O aplikacji".
 */
export function SettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const accounts = sortedAccounts(useSession());
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <SettingsItem
        title={t.generalSettings}
        icon="cog-outline"
        role="link"
        testID="settings-general"
        onPress={() => router.push("/settings/general")}
      />
      <Divider />
      {accounts.map((a) => (
        <SettingsItem
          key={a.id}
          title={a.email}
          description={a.displayName || undefined}
          left={<Avatar address={{ email: a.email, name: a.displayName }} size={32} />}
          role="link"
          testID={`settings-account-${a.id}`}
          onPress={() => router.push(`/settings/account/${a.id}`)}
        />
      ))}
      <SettingsItem
        title={t.addAccount}
        icon="account-plus-outline"
        role="link"
        testID="settings-add-account"
        onPress={() => router.push("/settings/add-account")}
      />
      <Divider />
      <SettingsItem
        title={t.aboutApp}
        icon="information-outline"
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
