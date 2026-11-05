import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Providers } from "../src/Providers";
import { restoreAuth } from "../src/state/auth";

export default function RootLayout() {
  useEffect(() => {
    // Read the stored token once; until then the (app) guard shows a splash.
    void restoreAuth();
  }, []);

  return (
    <Providers>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </Providers>
  );
}
