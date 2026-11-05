import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useAppTheme } from "../../lib/theme";
import { useAccountIndex, useSession } from "../account";

/** Width of the navigation drawer (Material 3: 360 dp at most; Gmail is about 300 dp). */
export const DRAWER_WIDTH = 304;

/**
 * Layout of /u/<n>: the drawer of the Gmail app around the label lists and search. An index that
 * matches no account (removed meanwhile) goes back to the start, which picks the active one.
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
    <Drawer
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
  );
}
