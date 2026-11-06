import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFeature } from "../../lib/features";
import { t } from "../../lib/i18n";
import { setDensity, useUi, type Density } from "../../state/ui";
import { toast } from "../../state/toasts";
import { api } from "../client";
import { call, isApiError } from "../errors";
import { keys } from "../keys";
import type { Session, Settings, SettingsPatch } from "../types";
import { sessionQuery } from "./session";

/**
 * Keeps the device's copy of the server's density (useUi): the list draws with it before
 * GET /settings answers, and it is what a 0.3.0 server leaves in place.
 */
function cacheLocally(s: Settings): Settings {
  setDensity(s.density);
  return s;
}

/** GET /settings (server 0.4.0); GET /session carries the same object, used until it answers. */
export const settingsQuery = queryOptions({
  queryKey: keys.settings,
  queryFn: async ({ signal }) => cacheLocally(await call(api().GET("/settings", { signal }))),
  staleTime: Infinity,
});

/**
 * The user's settings: GET /settings when the server has it (0.4.0), else the copy in
 * GET /session (read only on 0.3.0). Undefined until either is loaded.
 */
export function useSettings(): Settings | undefined {
  const qc = useQueryClient();
  const enabled = useServerFeature("settings");
  const session = useQuery(sessionQuery).data;
  const server = useQuery({
    ...settingsQuery,
    enabled,
    initialData: () => qc.getQueryData<Session>(keys.session)?.settings,
    // The session's copy may be old: fetched once in the background.
    initialDataUpdatedAt: 0,
  }).data;
  return enabled ? (server ?? session?.settings) : session?.settings;
}

/** The message of a refused setting (422 invalid_setting / invalid_timezone). */
export function settingsErrorMessage(err: unknown): string {
  if (isApiError(err, 422))
    return err.code === "invalid_timezone" ? t.invalidTimezone : t.invalidSetting;
  return t.genericError;
}

/**
 * PATCH /settings with one field at a time (a JSON merge on the server, plan 5.1): the cache shows
 * the change at once, the answer (the whole object) replaces it and the session's copy; a refused
 * value (422) or another error puts the previous settings back and shows a snackbar.
 */
export function usePatchSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => call(api().PATCH("/settings", { body: patch })),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: keys.settings });
      const prev =
        qc.getQueryData<Settings>(keys.settings) ??
        qc.getQueryData<Session>(keys.session)?.settings;
      if (prev)
        qc.setQueryData<Settings>(keys.settings, { ...prev, ...(patch as Partial<Settings>) });
      return { prev };
    },
    onSuccess: (s) => {
      qc.setQueryData(keys.settings, cacheLocally(s));
      qc.setQueryData<Session>(keys.session, (old) => (old ? { ...old, settings: s } : old));
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.settings, ctx.prev);
      toast(settingsErrorMessage(err));
    },
  });
}

/**
 * Density of the thread list: `Settings.density` of the server when it has /settings (0.4.0),
 * else the device preference. Migration: the device value is not sent to the server; on 0.4.0 the
 * server's value wins and is copied to the device (the fallback for an older server).
 */
export function useDensity(): Density {
  const local = useUi((s) => s.density);
  const server = useSettings();
  const synced = useServerFeature("settings");
  return synced && server ? server.density : local;
}
