import {
  DarkTheme as NavDark,
  DefaultTheme as NavLight,
  type Theme as NavTheme,
} from "expo-router";
import { MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from "react-native-paper";

/** Colours of the Gmail app the MD3 roles of Paper do not have. */
type GmailColors = {
  /** Floating search bar (MD3 surface-container-high). */
  surfaceContainerHigh: string;
  /** Drawer sheet (MD3 surface-container-low). */
  surfaceContainerLow: string;
  /** Gmail red: the logotype and accents of important things. */
  brand: string;
  /** Page behind the cards of the thread list and the search results (MD3 surface-container). */
  listBackground: string;
  /** A row card of the list, also the floating search pill (MD3 surface-bright in light mode). */
  listCard: string;
  /** Swipe pills: archive (dark green), trash (red), snooze (blue), other actions (grey). */
  swipeArchive: string;
  swipeTrash: string;
  swipeSnooze: string;
  swipeOther: string;
  /** Icon on a swipe pill. */
  onSwipe: string;
  /** Filled pills of the thread's reply bar (Odpowiedz, Przekaż dalej) and their text. */
  replyButton: string;
  onReplyButton: string;
};

export type AppTheme = MD3Theme & { colors: MD3Theme["colors"] & GmailColors };

/**
 * Material 3 theme that reads as the Gmail app for Android (2026): Google blue as primary, the
 * thread list as light cards on a grey-lilac page (cards one container level above the #131314
 * page in dark mode), white surfaces elsewhere, the light-blue pill of the active drawer entry
 * (secondaryContainer) and the light-blue compose FAB (primaryContainer). Typography stays Paper's
 * MD3 type scale on the system font (Roboto on Android).
 */
export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#0b57d0",
    onPrimary: "#ffffff",
    primaryContainer: "#c2e7ff",
    onPrimaryContainer: "#001d35",
    secondaryContainer: "#d3e3fd",
    onSecondaryContainer: "#041e49",
    background: "#ffffff",
    onBackground: "#1f1f1f",
    surface: "#ffffff",
    onSurface: "#1f1f1f",
    surfaceVariant: "#e1e3e1",
    onSurfaceVariant: "#444746",
    outline: "#747775",
    outlineVariant: "#c4c7c5",
    error: "#b3261e",
    surfaceContainerHigh: "#e9eef6",
    surfaceContainerLow: "#f6f8fc",
    brand: "#c5221f",
    listBackground: "#eeedf4",
    listCard: "#faf8ff",
    swipeArchive: "#146c2e",
    swipeTrash: "#d93025",
    swipeSnooze: "#1a73e8",
    swipeOther: "#5f6368",
    onSwipe: "#ffffff",
    replyButton: "#535c71",
    onReplyButton: "#ffffff",
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#a8c7fa",
    onPrimary: "#062e6f",
    primaryContainer: "#004a77",
    onPrimaryContainer: "#c2e7ff",
    secondaryContainer: "#004a77",
    onSecondaryContainer: "#c2e7ff",
    background: "#131314",
    onBackground: "#e3e3e3",
    surface: "#131314",
    onSurface: "#e3e3e3",
    surfaceVariant: "#444746",
    onSurfaceVariant: "#c4c7c5",
    outline: "#8e918f",
    outlineVariant: "#444746",
    error: "#f2b8b5",
    surfaceContainerHigh: "#282a2c",
    surfaceContainerLow: "#1b1b1b",
    brand: "#f28b82",
    // The page stays the dark surface; cards one container level above it (surface-container).
    listBackground: "#131314",
    listCard: "#1e1f20",
    swipeArchive: "#146c2e",
    swipeTrash: "#b3261e",
    swipeSnooze: "#0b57d0",
    swipeOther: "#444746",
    onSwipe: "#ffffff",
    replyButton: "#3e4759",
    onReplyButton: "#dae2f9",
  },
};

/** The app theme of the current colour scheme, with the Gmail colours typed. */
export const useAppTheme = () => useTheme<AppTheme>();

/** Theme of the navigators (screen and drawer backgrounds, headers) matching the Paper theme. */
export function navigationTheme(theme: AppTheme): NavTheme {
  const base = theme.dark ? NavDark : NavLight;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
    },
  };
}

/** Smallest touch target (Material and Android accessibility guidelines), in dp. */
export const MIN_TOUCH = 48;
