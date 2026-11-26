import { Stack } from "expo-router";
import { useEffect } from "react";
import { Providers } from "../src/Providers";
import { setupQueryManagers } from "../src/features/sync/useEvents";
import { useLocale } from "../src/lib/i18n";
import { restoreAuth } from "../src/state/auth";
import { startLanguage } from "../src/state/language";

export default function RootLayout() {
  // The UI language: device, stored last language, sign-out (src/state/language.ts).
  useEffect(() => startLanguage(), []);
  const locale = useLocale();
  useEffect(() => {
    // Read the stored token once; until then the (app) guard shows a splash.
    void restoreAuth();
  }, []);
  // App focus and network state for the query cache (React Native has no window events).
  useEffect(() => setupQueryManagers(), []);

  return (
    <Providers>
      {/* A new language remounts every screen under the same navigation state (as silo-web
          remounts its router), so all visible text, headers and the drawer switch at once. */}
      <Stack key={locale} screenOptions={{ headerShown: false }} />
    </Providers>
  );
}
