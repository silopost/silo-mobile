import { useNavigation, useRouter } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { useState } from "react";
import { Alert } from "react-native";
import { logout } from "../../api/auth";
import { t } from "../../lib/i18n";
import { INBOX_SLUG } from "../../lib/labels";
import { sortedAccounts, useAccountIndex, useActiveAccount, useSession } from "../account";
import { AccountSwitcher } from "../accounts/AccountSwitcher";
import { SearchBar } from "./SearchBar";

/** The search bar of the mail views, wired to the drawer, the search and the account switcher. */
export function MailTopBar() {
  const navigation = useNavigation();
  const router = useRouter();
  const index = useAccountIndex();
  const session = useSession();
  const account = useActiveAccount();
  const [switcher, setSwitcher] = useState(false);
  const close = () => setSwitcher(false);

  return (
    <>
      <SearchBar
        account={account}
        // The drawer navigator is an ancestor; the action bubbles up to it.
        onMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
        onSearch={() => router.push(`/u/${index}/search`)}
        onAccount={() => setSwitcher(true)}
      />
      <AccountSwitcher
        visible={switcher}
        onDismiss={close}
        current={account}
        accounts={sortedAccounts(session)}
        onSwitch={(a) => {
          close();
          router.navigate(`/u/${a.position}/${INBOX_SLUG}`);
        }}
        onManage={() => {
          close();
          router.push("/settings");
        }}
        onAddAccount={() => {
          // Adding an account (POST /accounts with the connection test) comes with slice 8.
          close();
          Alert.alert(t.addAccount, t.comingSoon);
        }}
        onSignOut={() => {
          close();
          void logout();
        }}
      />
    </>
  );
}
