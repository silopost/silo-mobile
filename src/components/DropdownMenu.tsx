import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Divider, Icon, Menu, Text, TouchableRipple } from "react-native-paper";
import { t } from "../lib/i18n";
import { useAppTheme } from "../lib/theme";

/**
 * A ⋮ (or 📎) menu as in the Gmail app (2026): it opens over its button, every entry has a 24 dp
 * icon before the text and dividers separate the groups. Mount it only while open: Paper's Menu
 * runs a hide animation on mount otherwise.
 */
export function DropdownMenu({
  anchor,
  onDismiss,
  children,
}: {
  anchor: ReactNode;
  onDismiss: () => void;
  children: ReactNode;
}) {
  return (
    // statusBarHeight 0: the window is edge to edge, so the anchor is measured from the screen top
    // already (Paper would add the status bar again and open the menu under its button).
    <Menu
      visible
      onDismiss={onDismiss}
      anchor={anchor}
      statusBarHeight={0}
      // The scrim's spoken label (Paper's own is English).
      overlayAccessibilityLabel={t.close}
      contentStyle={styles.menu}
    >
      {children}
    </Menu>
  );
}

/**
 * One entry: at least 48 dp high, icon 8 dp and text 40 dp from the menu's edge; `danger` in red.
 * A long title wraps to a second line instead of being cut (Paper's Menu.Item keeps one line).
 */
export function MenuEntry({
  icon,
  title,
  onPress,
  danger = false,
  disabled = false,
  testID,
}: {
  icon: string;
  title: string;
  onPress: () => void;
  /** "Zgłoś spam": text and icon in the error colour. */
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useAppTheme();
  const c = theme.colors;
  const ink = danger ? c.error : disabled ? c.onSurfaceDisabled : c.onSurface;
  const iconInk = danger ? c.error : disabled ? c.onSurfaceDisabled : c.onSurfaceVariant;
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled }}
      style={styles.entry}
    >
      <View style={styles.row}>
        <Icon source={icon} size={24} color={iconInk} />
        <Text variant="bodyLarge" numberOfLines={2} style={[styles.title, { color: ink }]}>
          {title}
        </Text>
      </View>
    </TouchableRipple>
  );
}

/** Line between two groups of entries. */
export function MenuDivider() {
  return <Divider style={styles.divider} />;
}

const styles = StyleSheet.create({
  menu: { paddingVertical: 8 },
  // Gmail's menus are 196–224 dp wide; the menu sizes to its longest entry above this.
  entry: { minWidth: 196, maxWidth: 280, minHeight: 48, justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 12,
  },
  title: { flexShrink: 1 },
  divider: { marginVertical: 4 },
});
