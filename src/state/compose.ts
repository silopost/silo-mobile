import { create } from "zustand";

/** Why the last send of a draft failed: Draft.lastSend or an outbound.status failed event. */
export type SendFailure = { error?: string; failedRecipients?: string[] };

type ComposeState = {
  /**
   * Latest version of a draft saved elsewhere (another device or tab), from draft.updated events.
   * The compose screen compares it with the version it edits and offers "Wczytaj / Nadpisz"
   * instead of overwriting blindly (409 draft_version_conflict otherwise).
   */
  remoteVersions: Record<string, number>;
  setRemoteVersion: (draftId: string, version: number) => void;
  clearRemoteVersion: (draftId: string) => void;
  /** Failed sends by draft: the compose screen shows a red bar (plan 3.9 step 6). */
  failures: Record<string, SendFailure>;
  setFailure: (draftId: string, failure: SendFailure | null) => void;
};

export const useCompose = create<ComposeState>()((set) => ({
  remoteVersions: {},
  setRemoteVersion: (draftId, version) =>
    set((s) =>
      // An older event replayed after a newer one changes nothing.
      (s.remoteVersions[draftId] ?? -1) >= version
        ? s
        : { remoteVersions: { ...s.remoteVersions, [draftId]: version } },
    ),
  clearRemoteVersion: (draftId) =>
    set(({ remoteVersions }) => {
      const { [draftId]: _, ...rest } = remoteVersions;
      return { remoteVersions: rest };
    }),
  failures: {},
  setFailure: (draftId, failure) =>
    set(({ failures }) => {
      const { [draftId]: _, ...rest } = failures;
      return { failures: failure ? { ...rest, [draftId]: failure } : rest };
    }),
}));
