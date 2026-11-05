import { StyleSheet } from "react-native";
import { Snackbar as PaperSnackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hideToast, useToasts } from "../../state/toasts";

/** How long a toast without hideAt stays (Material's default for a short message). */
export const DEFAULT_DURATION = 4000;
/** Room for the compose FAB below the snackbar (56 dp FAB + 16 dp margin + 8 dp gap). */
const ABOVE_FAB = 80;

/** The app's snackbar: the current toast at the bottom, above the compose FAB. */
export function Snackbar() {
  const current = useToasts((s) => s.current);
  const insets = useSafeAreaInsets();
  const duration = current?.hideAt ? Math.max(1000, current.hideAt - Date.now()) : DEFAULT_DURATION;
  return (
    <PaperSnackbar
      key={current?.id}
      visible={!!current}
      duration={duration}
      onDismiss={() => hideToast(current?.id)}
      action={current?.action}
      wrapperStyle={[styles.wrapper, { bottom: insets.bottom + ABOVE_FAB }]}
    >
      {current?.message ?? ""}
    </PaperSnackbar>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0 },
});
