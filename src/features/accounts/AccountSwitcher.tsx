import { useQueries } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  Icon,
  IconButton,
  Modal,
  Portal,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { labelsQuery } from "../../api/queries/labels";
import { Avatar } from "../../components/Avatar";
import { formatCount } from "../../lib/format";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import type { Account } from "../account";

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** The account of the route. */
  current: Account | undefined;
  /** All accounts of the session, ordered by position. */
  accounts: Account[];
  onSwitch: (account: Account) => void;
  onManage: () => void;
  onAddAccount: () => void;
  onSignOut: () => void;
};

/**
 * The account dialog of the Gmail app, opened from the avatar of the search bar: the current
 * account, the other accounts with their unread Inbox counters, "Dodaj konto", "Zarządzaj kontami"
 * and sign-out.
 */
export function AccountSwitcher({ visible, onDismiss, ...props }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        style={styles.modal}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.surfaceContainerHigh, marginTop: insets.top + 8 },
        ]}
      >
        {/* Mounted only while open, so the counters of other accounts load lazily. */}
        {visible && <SwitcherContent onDismiss={onDismiss} {...props} />}
      </Modal>
    </Portal>
  );
}

function SwitcherContent({
  onDismiss,
  current,
  accounts,
  onSwitch,
  onManage,
  onAddAccount,
  onSignOut,
}: Omit<Props, "visible">) {
  const theme = useAppTheme();
  const others = accounts.filter((a) => a.id !== current?.id);
  // One GET /labels per other account: the API has no unread summary across accounts.
  const unread = useQueries({
    queries: others.map((a) => labelsQuery(a.id)),
    combine: (results) =>
      results.map((r) => r.data?.labels?.find((l) => l.id === "INBOX")?.threadsUnread ?? undefined),
  });

  return (
    <ScrollView testID="account-switcher">
      <View style={styles.header}>
        <IconButton
          icon="close"
          onPress={onDismiss}
          accessibilityLabel={t.close}
          style={styles.close}
        />
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.brand }]}>
          {t.appName}
        </Text>
        <View style={styles.close} />
      </View>

      {current && (
        <View style={[styles.current, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.row}>
            <Avatar address={{ email: current.email, name: current.displayName }} size={40} />
            <View style={styles.texts}>
              {!!current.displayName && (
                <Text variant="titleSmall" numberOfLines={1}>
                  {current.displayName}
                </Text>
              )}
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {current.email}
              </Text>
            </View>
          </View>
          <Button
            mode="outlined"
            onPress={onManage}
            style={styles.manage}
            contentStyle={styles.touch}
          >
            {t.manageAccounts}
          </Button>
        </View>
      )}

      <View style={[styles.list, { backgroundColor: theme.colors.surface }]}>
        {others.map((a, i) => (
          <TouchableRipple
            key={a.id}
            testID={`account-${a.position}`}
            onPress={() => onSwitch(a)}
            accessibilityRole="button"
            accessibilityLabel={
              t.switchTo(a.email) + (unread[i] ? `, ${t.unreadCount(unread[i])}` : "")
            }
            style={styles.item}
          >
            <View style={styles.row}>
              <Avatar address={{ email: a.email, name: a.displayName }} />
              <View style={styles.texts}>
                {!!a.displayName && (
                  <Text variant="titleSmall" numberOfLines={1}>
                    {a.displayName}
                  </Text>
                )}
                <Text
                  variant="bodyMedium"
                  numberOfLines={1}
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {a.email}
                </Text>
              </View>
              {!!unread[i] && <Text variant="labelMedium">{formatCount(unread[i])}</Text>}
            </View>
          </TouchableRipple>
        ))}
        {others.length > 0 && <Divider />}
        <MenuRow icon="account-plus-outline" label={t.addAccount} onPress={onAddAccount} />
        <MenuRow icon="account-cog-outline" label={t.manageAccounts} onPress={onManage} />
        <Divider />
        <MenuRow icon="logout" label={t.signOut} onPress={onSignOut} />
      </View>
    </ScrollView>
  );
}

function MenuRow(props: { icon: string; label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <TouchableRipple
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      style={styles.item}
    >
      <View style={styles.row}>
        <View style={styles.menuIcon}>
          <Icon source={props.icon} size={24} color={theme.colors.onSurfaceVariant} />
        </View>
        <Text variant="bodyLarge" style={styles.texts}>
          {props.label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "flex-start" },
  sheet: { marginHorizontal: 12, borderRadius: 28, paddingBottom: 8, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingTop: 4 },
  close: { width: MIN_TOUCH, height: MIN_TOUCH, margin: 0 },
  title: { flex: 1, textAlign: "center", fontWeight: "500" },
  current: { marginHorizontal: 8, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  manage: { marginTop: 12, alignSelf: "center" },
  touch: { minHeight: MIN_TOUCH },
  list: {
    marginHorizontal: 8,
    marginTop: 2,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  item: { minHeight: 56, justifyContent: "center", paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  texts: { flex: 1 },
  menuIcon: { width: 32, alignItems: "center" },
});
