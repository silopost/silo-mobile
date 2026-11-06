import { useQuery } from "@tanstack/react-query";
import { metaQuery } from "../api/queries/meta";
import type { Meta } from "../api/types";
import { useAuth } from "../state/auth";

/** Features of a later API than the oldest server the app supports (0.3.0). */
export type ServerFeature = "search" | "snooze" | "schedule" | "settings" | "filters";

/**
 * The first server version of each feature. `GET /meta` has no feature flags (plan 5.1 lists
 * them, the contract does not; see docs/NOTES-FOR-SILO.md), so the app decides by version.
 */
const SINCE: Record<ServerFeature, string> = {
  search: "0.4.0",
  snooze: "0.4.0",
  schedule: "0.4.0",
  settings: "0.4.0",
  filters: "0.4.0",
};

/** MAJOR.MINOR.PATCH of a version ("v0.4.0", "0.4.0-rc.1", "0.4"); null when it is none. */
function parse(version: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(version.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null;
}

/**
 * Compares two versions by MAJOR.MINOR.PATCH (a pre-release counts as its release): negative,
 * zero or positive. A version that does not parse ("dev", "", a commit) is the newest.
 */
export function compareVersions(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return pa ? -1 : pb ? 1 : 0;
  const [a1, a2, a3] = pa;
  const [b1, b2, b3] = pb;
  return a1 !== b1 ? a1 - b1 : a2 !== b2 ? a2 - b2 : a3 - b3;
}

/** Whether the server of `meta` has a feature; false while /meta is not known. */
export function hasServerFeature(
  meta: Pick<Meta, "serverVersion"> | undefined,
  feature: ServerFeature,
): boolean {
  if (!meta) return false;
  return compareVersions(meta.serverVersion ?? "", SINCE[feature]) >= 0;
}

/** hasServerFeature for the instance the user is signed in to (GET /meta, cached for good). */
export function useServerFeature(feature: ServerFeature): boolean {
  const serverUrl = useAuth((s) => s.serverUrl) ?? "";
  const meta = useQuery({ ...metaQuery(serverUrl), enabled: !!serverUrl });
  return hasServerFeature(meta.data, feature);
}
