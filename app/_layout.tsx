import { Stack } from "expo-router";
import { useEffect } from "react";
import { Providers } from "../src/Providers";
import { setupQueryManagers } from "../src/features/sync/useEvents";
import { restoreAuth } from "../src/state/auth";

export default function RootLayout() {
  useEffect(() => {
    // Read the stored token once; until then the (app) guard shows a splash.
    void restoreAuth();
  }, []);
  // App focus and network state for the query cache (React Native has no window events).
  useEffect(() => setupQueryManagers(), []);

  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }} />
    </Providers>
  );
}
