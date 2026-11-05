import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider, type Metrics } from "react-native-safe-area-context";
import { queryClient } from "./api/cache";
import { darkTheme, lightTheme } from "./lib/theme";

type Props = {
  children: ReactNode;
  /** Fixed safe-area insets (tests, where there is no native view to measure). */
  initialMetrics?: Metrics;
};

/** Context every screen needs: server-state cache, Material 3 theme, safe-area insets. */
export function Providers({ children, initialMetrics }: Props) {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={scheme === "dark" ? darkTheme : lightTheme}>{children}</PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
