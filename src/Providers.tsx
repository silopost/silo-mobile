import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";
import { queryClient } from "./api/cache";
import { darkTheme, lightTheme, navigationTheme, type AppTheme } from "./lib/theme";
import { useUi } from "./state/ui";

type Props = {
  children: ReactNode;
  /** Fixed safe-area insets (tests, where there is no native view to measure). */
  initialMetrics?: Metrics;
};

/** Light or dark: the preference of this device, the system colour scheme for "system". */
export function useAppThemeChoice(): AppTheme {
  const scheme = useColorScheme();
  const preference = useUi((s) => s.theme);
  const dark = preference === "system" ? scheme === "dark" : preference === "dark";
  return dark ? darkTheme : lightTheme;
}

/**
 * Context every screen needs: gestures (drawer), safe-area insets, server-state cache, the
 * Material 3 theme for Paper and the navigators, and a status bar matching the theme.
 */
export function Providers({ children, initialMetrics }: Props) {
  const theme = useAppThemeChoice();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <ThemeProvider value={navigationTheme(theme)}>
              <StatusBar style={theme.dark ? "light" : "dark"} />
              {children}
            </ThemeProvider>
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
