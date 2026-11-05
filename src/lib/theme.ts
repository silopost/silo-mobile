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
};

export type AppTheme = MD3Theme & { colors: MD3Theme["colors"] & GmailColors };

/**
 * Material 3 theme that reads as the Gmail app for Android: Google blue as primary, white list
 * background (#131314 in dark mode), the light-blue pill of the active drawer entry
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
