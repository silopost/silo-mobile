import { StyleSheet } from "react-native";
import { AnimatedFAB } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";

type Props = {
  onPress: () => void;
  /**
   * Pencil and "Utwórz" when true, the pencil alone when false. The thread list (slice 3) folds
   * it while the user scrolls down, as Gmail does; until then it stays extended.
   */
  extended?: boolean;
};

/** The extended compose FAB of the Gmail app, bottom right above the navigation bar. */
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
      iconMode="static"
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
  fab: { position: "absolute", right: 16 },
});
