import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { sessionQuery } from "../../api/queries/session";
import { settingsQuery, usePatchSettings } from "../../api/queries/settings";
import { useServerFeature } from "../../lib/features";
import { isLocale, type Locale } from "../../lib/i18n";
import { useAuth } from "../../state/auth";
import { setLanguage } from "../../state/language";

/**
 * Follows the user's `settings.language` (server 0.6.0) while signed in: after the sign-in, after
 * a change on another device (settings.updated) and after a refused change (the rollback of
 * usePatchSettings). GET /settings when it is cached or answers, else the copy in GET /session.
 * Older servers have no such setting: the language stays the choice made on this device. Safe to
 * call before the sign-in (the (app) layout): it reads nothing while signed out.
 */
export function useServerLanguage(): void {
  const signedIn = useAuth((s) => s.status === "signedIn");
  const enabled = useServerFeature("language") && signedIn;
  const session = useQuery({ ...sessionQuery, enabled }).data;
  const settings = useQuery({ ...settingsQuery, enabled }).data;
  const language = enabled ? (settings ?? session?.settings)?.language : undefined;
  useEffect(() => {
    if (isLocale(language)) setLanguage(language);
  }, [language]);
}

/**
 * Changes the UI language from the general settings: PATCH /settings on a server that keeps it
 * (the optimistic cache switches the language at once, a refusal puts the previous one back with
 * a snackbar), else on this device only.
 */
export function useChangeLanguage(): (locale: Locale) => void {
  const synced = useServerFeature("language");
  const patch = usePatchSettings();
  return (locale) => (synced ? patch.mutate({ language: locale }) : setLanguage(locale));
}
