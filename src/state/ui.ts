import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";
/** What a swipe on a thread row does (the list of slice 3), as in Gmail's swipe actions. */
export type SwipeAction = "archive" | "trash" | "none";
export type Density = "default" | "compact";

type UiState = {
  theme: ThemePreference;
  swipeLeftAction: SwipeAction;
  swipeRightAction: SwipeAction;
  density: Density;
};

export const defaultUi: UiState = {
  theme: "system",
  swipeLeftAction: "archive",
  swipeRightAction: "trash",
  density: "default",
};

/**
 * Preferences of this device (not server settings): kept in AsyncStorage. They only change how
 * the app looks and which local gesture maps to which API action.
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
