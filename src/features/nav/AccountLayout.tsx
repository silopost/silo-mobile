import { Redirect, useGlobalSearchParams, useRouter } from "expo-router";
import { Drawer, type DrawerContentComponentProps } from "expo-router/drawer";
import { useState } from "react";
import { useLabels } from "../../api/queries/labels";
import { useAppTheme } from "../../lib/theme";
import { useAccountIndex, useActiveAccount, useSession } from "../account";
import { CreateLabelDialog } from "../labels/CreateLabelDialog";
import { ThreadActionsRoot } from "../threadlist/ThreadActionsRoot";
import { MailDrawer } from "./MailDrawer";

/** Width of the navigation drawer (Material 3: 360 dp at most; Gmail is about 300 dp). */
export const DRAWER_WIDTH = 304;

/** The drawer of the account in the route: its labels, the shown one active. */
function AccountDrawerContent({ navigation }: DrawerContentComponentProps) {
  const router = useRouter();
  const index = useAccountIndex();
  const account = useActiveAccount();
  const labels = useLabels(account?.id);
  const { label } = useGlobalSearchParams<{ label?: string }>();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <MailDrawer
        labels={labels}
        activeSlug={label}
        onSelect={(slug) => {
          navigation.closeDrawer();
          router.navigate(`/u/${index}/${slug}`);
        }}
        onCreateLabel={() => {
          navigation.closeDrawer();
          setCreating(true);
        }}
        onSettings={() => {
          navigation.closeDrawer();
          router.push("/settings");
        }}
      />
      {account && (
        <CreateLabelDialog
          visible={creating}
          onDismiss={() => setCreating(false)}
          accountId={account.id}
        />
      )}
    </>
  );
}

/**
 * Layout of /u/<n>: the drawer of the Gmail app around the label lists and search, opened by a
 * swipe from the left edge or the menu button of the search bar. An index that matches no account
 * (removed meanwhile) goes back to the start, which picks the active one.
 */
export function AccountLayout() {
  const theme = useAppTheme();
  const session = useSession();
  const index = useAccountIndex();
  const accounts = session?.accounts ?? [];
  if (accounts.length > 0 && !accounts.some((a) => a.position === index)) {
    return <Redirect href="/" />;
  }

  return (
    // The thread actions of every view of the account: lists, search, the thread screen.
    <ThreadActionsRoot>
      <Drawer
        drawerContent={(props) => <AccountDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          swipeEdgeWidth: 32,
          drawerStyle: { backgroundColor: theme.colors.surfaceContainerLow, width: DRAWER_WIDTH },
        }}
      >
        <Drawer.Screen name="[label]" />
        <Drawer.Screen name="search" options={{ swipeEnabled: false }} />
      </Drawer>
    </ThreadActionsRoot>
  );
}
