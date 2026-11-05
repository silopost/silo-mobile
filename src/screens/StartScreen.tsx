import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { isApiError } from "../api/errors";
import { sessionQuery } from "../api/queries/session";
import { defaultAccount } from "../features/account";
import { t } from "../lib/i18n";
import { INBOX_SLUG } from "../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";

/**
 * Start of the signed-in app: opens the Inbox of the active account (settings.activeAccountId,
 * else the first account by position), as /u/<position>/inbox.
 */
export function StartScreen() {
  const session = useQuery(sessionQuery);
  const theme = useAppTheme();
  const style = [styles.center, { backgroundColor: theme.colors.background }];

  if (session.isPending) {
    return <ActivityIndicator style={style} accessibilityLabel={t.loading} />;
  }
  if (session.isError) {
    return (
      <ScrollView contentContainerStyle={style}>
        <Text accessibilityRole="alert">
          {isApiError(session.error) ? t.genericError : t.serverUnreachable}
        </Text>
        <Button onPress={() => session.refetch()} contentStyle={styles.touch}>
          {t.retry}
        </Button>
      </ScrollView>
    );
  }

  const account = defaultAccount(session.data);
  if (!account) {
    return (
      <ScrollView contentContainerStyle={style}>
        <Text>{t.noAccounts}</Text>
      </ScrollView>
    );
  }
  return <Redirect href={`/u/${account.position}/${INBOX_SLUG}`} />;
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  touch: { minHeight: MIN_TOUCH },
});
