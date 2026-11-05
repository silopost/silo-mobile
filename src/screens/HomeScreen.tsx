import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, List, Text } from "react-native-paper";
import { isApiError } from "../api/errors";
import { sessionQuery } from "../api/queries/session";
import { t } from "../lib/i18n";
import { MIN_TOUCH } from "../lib/theme";

/** Temporary start screen of slice 1: who is signed in and their accounts (GET /session). */
export function HomeScreen() {
  const session = useQuery(sessionQuery);

  if (session.isPending) {
    return <ActivityIndicator style={styles.center} accessibilityLabel={t.loading} />;
  }
  if (session.isError) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text accessibilityRole="alert">
          {isApiError(session.error) ? t.genericError : t.serverUnreachable}
        </Text>
        <Button onPress={() => session.refetch()} contentStyle={styles.touch}>
          {t.retry}
        </Button>
      </ScrollView>
    );
  }

  const { user, accounts } = session.data;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleMedium" accessibilityRole="header">
        {t.signedInAs(user.email)}
      </Text>
      <List.Section title={t.accounts}>
        {(accounts ?? []).map((a) => (
          <List.Item
            key={a.id}
            title={a.displayName || a.email}
            description={`${a.email} · ${t.accountStates[a.state]}`}
            left={(props) => <List.Icon {...props} icon="email-outline" />}
          />
        ))}
      </List.Section>
      <Link href="/settings/sessions" asChild>
        <Button mode="outlined" contentStyle={styles.touch} accessibilityLabel={t.manageSessions}>
          {t.manageSessions}
        </Button>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  content: { padding: 16, gap: 8 },
  touch: { minHeight: MIN_TOUCH },
});
