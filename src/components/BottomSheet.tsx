import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Modal, Portal, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../lib/theme";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  testID?: string;
  /** Rows of the sheet (scrolled when long). */
  children: ReactNode;
  /** Fixed part below the rows, e.g. the buttons of the sheet. */
  footer?: ReactNode;
};

/**
 * Modal bottom sheet of Material 3 on Paper's Modal: a scrim, a sheet from the bottom edge with
 * a drag handle and a title. No drag-to-dismiss: the scrim, the back button and the sheet's own
 * buttons close it. Mounted only while open (no hidden sheets in the tree).
 */
export function BottomSheet({ visible, onDismiss, title, testID, children, footer }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Portal>
      <Modal
        visible
        onDismiss={onDismiss}
        style={styles.modal}
        contentContainerStyle={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surfaceContainerLow,
            paddingBottom: insets.bottom + 8,
            marginTop: insets.top + 56,
          },
        ]}
      >
        <View testID={testID} style={styles.fill}>
          <View
            style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text
            variant="titleMedium"
            accessibilityRole="header"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          <ScrollView style={styles.rows} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%" },
  fill: { flexShrink: 1 },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 16,
    opacity: 0.4,
  },
  title: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  rows: { flexGrow: 0 },
});
