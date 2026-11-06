import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import { call } from "../errors";
import { keys } from "../keys";

/**
 * GET /snooze/presets: Gmail's suggestions ("Dziś później", "Jutro", ...) computed by the server
 * in the user's time zone (plan 2.6, 3.10). The app only translates them by `key` and formats
 * `until`; it never computes a wake time.
 */
export const snoozePresetsQuery = queryOptions({
  queryKey: keys.snoozePresets,
  queryFn: ({ signal }) => call(api().GET("/snooze/presets", { signal })),
  // "Dziś później" goes away as the day passes: asked again on every opening of the sheet.
  staleTime: 0,
});
