import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

/**
 * Minimal Material 3 theme of the first slice: Paper's defaults with the Gmail blue as primary.
 * The full Gmail look (palette, typography, components) comes with the mail views.
 */
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: "#0b57d0", onPrimary: "#ffffff" },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, primary: "#a8c7fa", onPrimary: "#062e6f" },
};

/** Smallest touch target (Material and Android accessibility guidelines), in dp. */
export const MIN_TOUCH = 48;
