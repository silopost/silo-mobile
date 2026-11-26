import { StyleSheet } from "react-native";
import { AnimatedFAB } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";

type Props = {
  onPress: () => void;
  /**
   * Pencil and "Utwórz" when true, the pencil alone when false. The thread list folds it while
   * the user scrolls down, as Gmail does.
   */
  extended?: boolean;
};

/**
 * The extended compose FAB of the Gmail app, bottom right above the navigation bar: 56 dp high,
 * 16 dp corners, the pencil left of the label. Paper's "dynamic" icon mode keeps the pencil at the
 * leading edge and slides it to the right end when the FAB folds; its "static" mode pins the icon
 * to the right end and lays the label over it.
 */
export function ComposeFab({ onPress, extended = true }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <AnimatedFAB
      icon="pencil-outline"
      label={t.compose}
      extended={extended}
      onPress={onPress}
      animateFrom="right"
      iconMode="dynamic"
      accessibilityLabel={t.compose}
      color={theme.colors.onPrimaryContainer}
      style={[
        styles.fab,
        { backgroundColor: theme.colors.primaryContainer, bottom: insets.bottom + 16 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // 24 dp from the right edge and 16 dp above the system bar, as in Gmail (2026).
  fab: { position: "absolute", right: 24 },
});
