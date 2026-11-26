import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "../lib/plural";

export type ThemePreference = "system" | "light" | "dark";
/** What a swipe on a thread row does (the list of slice 3), as in Gmail's swipe actions. */
export type SwipeAction = "archive" | "trash" | "snooze" | "none";
/** Row density of the thread list; the server's `Settings.density` on 0.4.0 (comfortable only there). */
export type Density = "default" | "comfortable" | "compact";
/** Remote images of a message: behind "Pokaż obrazy" (ask) or loaded at once (always). */
export type RemoteImages = "ask" | "always";

export type UiState = {
  theme: ThemePreference;
  swipeLeftAction: SwipeAction;
  swipeRightAction: SwipeAction;
  density: Density;
  /** Ask before moving threads to Trash (row, selection bar, thread); off as in Gmail. */
  confirmTrash: boolean;
  /** Ask before archiving threads; off as in Gmail. */
  confirmArchive: boolean;
  /** Mark an unread thread read when it is opened; on as in Gmail. */
  markReadOnOpen: boolean;
  showRemoteImages: RemoteImages;
  /**
   * The UI language used last while signed in (the choice, or the server's settings.language),
   * so the app starts in it before GET /settings answers; null: the device language (signed out).
   */
  language: Locale | null;
};

export const defaultUi: UiState = {
  theme: "system",
  // Gmail archives with a swipe either way until the user picks another action.
  swipeLeftAction: "archive",
  swipeRightAction: "archive",
  density: "default",
  confirmTrash: false,
  confirmArchive: false,
  markReadOnOpen: true,
  showRemoteImages: "ask",
  language: null,
};

/**
 * Preferences of this device (API 0.3.0 has no GET/PATCH /settings): kept
 * in AsyncStorage. They only change how the app looks and which local gesture or confirmation
 * leads to which API call. Keys added later get their defaults from persist's shallow merge of the
 * stored state over the initial one, so they need no migration.
 */
export const useUi = create<UiState>()(
  persist(() => ({ ...defaultUi }), {
    name: "silo.ui",
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

export const setTheme = (theme: ThemePreference) => useUi.setState({ theme });
export const setSwipeActions = (left: SwipeAction, right: SwipeAction) =>
  useUi.setState({ swipeLeftAction: left, swipeRightAction: right });
export const setDensity = (density: Density) => useUi.setState({ density });
export const setConfirmTrash = (confirmTrash: boolean) => useUi.setState({ confirmTrash });
export const setConfirmArchive = (confirmArchive: boolean) => useUi.setState({ confirmArchive });
export const setMarkReadOnOpen = (markReadOnOpen: boolean) => useUi.setState({ markReadOnOpen });
export const setShowRemoteImages = (showRemoteImages: RemoteImages) =>
  useUi.setState({ showRemoteImages });
