import { create } from "zustand";

type ComposeState = {
  /**
   * Latest version of a draft saved elsewhere (another device or tab), from draft.updated events.
   * The compose screen (slice 7) compares it with the version it edits and offers
   * "Wczytaj / Nadpisz" instead of overwriting blindly (409 version_conflict otherwise).
   */
  remoteVersions: Record<string, number>;
  setRemoteVersion: (draftId: string, version: number) => void;
  clearRemoteVersion: (draftId: string) => void;
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
}));
