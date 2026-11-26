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
 * The search bar at the top of the Gmail app (2026): the menu button, the 56 dp pill with
 * "Szukaj w poczcie" centred (opens the search) and the avatar of the account (opens the account
 * switcher), the two buttons outside the pill.
 */
export function SearchBar({ account, onMenu, onSearch, onAccount }: Props) {
  const theme = useAppTheme();
  return (
    <View style={styles.bar} pointerEvents="box-none">
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
        style={[styles.search, { backgroundColor: theme.colors.listCard }]}
      >
        <Text
          variant="bodyLarge"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {t.searchMail}
        </Text>
      </Pressable>
      {account ? (
        <Pressable
          onPress={onAccount}
          accessibilityRole="button"
          accessibilityLabel={t.accountMenu(account.email)}
          style={styles.avatar}
        >
          <Avatar address={{ email: account.email, name: account.displayName }} />
        </Pressable>
      ) : (
        <View style={styles.avatar} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Gmail: menu 4–52 dp, pill 60–348 dp, avatar 356–407 dp (on a 411 dp wide screen).
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
  },
  icon: { margin: 0, width: MIN_TOUCH, height: MIN_TOUCH },
  avatar: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  search: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
