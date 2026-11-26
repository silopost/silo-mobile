import { deviceLocale, setLocale, type Locale } from "../lib/i18n";
import { useAuth } from "./auth";
import { useUi } from "./ui";

/**
 * Where the UI language comes from:
 * - signed out: the device language (Polish on a Polish device, English otherwise);
 * - signed in: the user's `settings.language` on a server that has it (useServerLanguage), else
 *   the choice made in the general settings, kept on this device only;
 * - at start-up: the language used last while signed in (useUi `language`), so the app opens in
 *   it before GET /settings answers.
 */
export function setLanguage(locale: Locale): void {
  if (useUi.getState().language !== locale) useUi.setState({ language: locale });
  setLocale(locale);
}

/**
 * Applies the stored language once the device preferences are read and goes back to the device
 * language at every sign-out. Returns the cleanup.
 */
export function startLanguage(): () => void {
  const applyStored = () => {
    const stored = useUi.getState().language;
    if (stored && useAuth.getState().status !== "signedOut") setLocale(stored);
  };
  let unhydrated = () => {};
  if (useUi.persist.hasHydrated()) applyStored();
  else unhydrated = useUi.persist.onFinishHydration(applyStored);

  const unauth = useAuth.subscribe((s, prev) => {
    if (s.status === "signedOut" && prev.status !== "signedOut") {
      useUi.setState({ language: null });
      setLocale(deviceLocale());
    }
  });
  return () => {
    unhydrated();
    unauth();
  };
}
