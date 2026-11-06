import { useIsFocused } from "expo-router";
import { Snackbar } from "../toasts/Snackbar";

/** The app's snackbar on a settings screen (no FAB below it), only while the screen is shown. */
export function SettingsSnackbar() {
  const focused = useIsFocused();
  return focused ? <Snackbar offset={16} /> : null;
}
