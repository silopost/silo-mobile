import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { t } from "../../src/lib/i18n";
import { useAuth } from "../../src/state/auth";

/** Screens of a signed-in user: a splash while the token is read, sign-in when there is none. */
export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const theme = useTheme();

  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" accessibilityLabel={t.loading} />
      </View>
    );
  }
  if (status === "signedOut") return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t.appName }} />
      <Stack.Screen name="settings/sessions" options={{ title: t.sessionsTitle }} />
    </Stack>
  );
}
