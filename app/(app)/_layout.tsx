import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { t } from "../../src/lib/i18n";
import { useEvents } from "../../src/features/sync/useEvents";
import { useAppTheme } from "../../src/lib/theme";
import { useAuth } from "../../src/state/auth";

/** Screens of a signed-in user: a splash while the token is read, sign-in when there is none. */
export default function AppLayout() {
  const status = useAuth((s) => s.status);
  const theme = useAppTheme();
  // Server events while signed in and in the foreground (one stream for every screen).
  useEvents();

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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* The mail views of an account: drawer, search bar and FAB of their own. */}
      <Stack.Screen name="u/[account]" options={{ headerShown: false }} />
      <Stack.Screen name="settings/index" options={{ title: t.settings }} />
      <Stack.Screen name="settings/sessions" options={{ title: t.sessionsTitle }} />
      <Stack.Screen
        name="compose"
        options={{
          title: t.compose,
          // The screen draws the top bar of Gmail's compose itself.
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
