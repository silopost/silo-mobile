import { StyleSheet } from "react-native";
import { Snackbar as PaperSnackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hideToast, useToasts } from "../../state/toasts";

/** Room for the compose FAB below the snackbar (56 dp FAB + 16 dp margin + 8 dp gap). */
const ABOVE_FAB = 80;

/**
 * The app's snackbar: the current toast at the bottom, above the compose FAB. `offset` is the
 * room kept below it (compose has the formatting toolbar there instead of the FAB).
 */
export function Snackbar({ offset = ABOVE_FAB }: { offset?: number }) {
  const current = useToasts((s) => s.current);
  const insets = useSafeAreaInsets();
  return (
    <PaperSnackbar
      key={current?.id}
      visible={!!current}
      duration={current?.duration}
      onDismiss={() => hideToast(current?.id)}
      action={current?.action}
      wrapperStyle={[styles.wrapper, { bottom: insets.bottom + offset }]}
    >
      {current?.message ?? ""}
    </PaperSnackbar>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", left: 0, right: 0 },
});
