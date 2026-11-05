import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { Avatar } from "../../components/Avatar";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import type { Account } from "../account";

type Props = {
  account: Account | undefined;
  onMenu: () => void;
  onSearch: () => void;
  onAccount: () => void;
};

/**
 * The floating search bar at the top of the Gmail app: menu button, "Szukaj w poczcie" (opens the
 * search) and the avatar of the account (opens the account switcher).
 */
export function SearchBar({ account, onMenu, onSearch, onAccount }: Props) {
  const theme = useAppTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
      <IconButton
        icon="menu"
        size={24}
        iconColor={theme.colors.onSurfaceVariant}
        onPress={onMenu}
        accessibilityLabel={t.openMenu}
        style={styles.icon}
      />
      <Pressable
        onPress={onSearch}
        accessibilityRole="search"
        accessibilityLabel={t.searchMail}
        style={styles.search}
      >
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {t.searchMail}
        </Text>
      </Pressable>
      {account && (
        <Pressable
          onPress={onAccount}
          accessibilityRole="button"
          accessibilityLabel={t.accountMenu(account.email)}
          style={styles.avatar}
          hitSlop={4}
        >
          <Avatar address={{ email: account.email, name: account.displayName }} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 28,
    paddingHorizontal: 4,
  },
  icon: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  search: { flex: 1, minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: 4 },
  avatar: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
});
