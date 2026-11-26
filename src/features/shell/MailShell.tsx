import { useIsFocused, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../lib/theme";
import { useActiveAccount } from "../account";
import { Snackbar } from "../toasts/Snackbar";
import { MailTopBar } from "../topbar/MailTopBar";
import { ComposeFab } from "./ComposeFab";
import { TOP_BAR_HEIGHT, TopBarScroll } from "./topBarScroll";

type Props = {
  /** Collapses the FAB to its icon (see ComposeFab). */
  fabExtended?: boolean;
  /** Replaces the search bar, e.g. with the selection bar of the list. */
  topBar?: ReactNode;
  children: ReactNode;
};

/**
 * Frame of the mail views: the floating search bar over the list, content, compose FAB, snackbar.
 * As in Gmail 2026 the search bar slides away while the list scrolls down and comes back as soon
 * as it scrolls up (the list's offset, clamped to the bar's height, natively driven); a bar that
 * replaces it (selection) stays in place.
 */
export function MailShell({ fabExtended = true, topBar, children }: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  const account = useActiveAccount();
  // One snackbar on screen: compose and the thread screen cover the list (the toast store is
  // shared, so "Wysłano · Cofnij" shown by compose appears here once compose closes).
  const focused = useIsFocused();
  const [{ scrollY, translateY }] = useState(() => {
    const y = new Animated.Value(0);
    const offset = Animated.diffClamp(y, 0, TOP_BAR_HEIGHT).interpolate({
      inputRange: [0, TOP_BAR_HEIGHT],
      outputRange: [0, -TOP_BAR_HEIGHT],
    });
    return { scrollY: y, translateY: offset };
  });

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colors.listBackground }]}
    >
      <View style={styles.content}>
        <TopBarScroll.Provider value={scrollY}>{children}</TopBarScroll.Provider>
        {topBar ? (
          <View style={[styles.bar, { backgroundColor: theme.colors.listBackground }]}>
            {topBar}
          </View>
        ) : (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.bar,
              { backgroundColor: theme.colors.listBackground, transform: [{ translateY }] },
            ]}
          >
            <MailTopBar />
          </Animated.View>
        )}
      </View>
      <ComposeFab
        extended={fabExtended}
        onPress={() =>
          // A new message from the account of the list (POST /drafts {accountId}).
          router.push(
            account ? { pathname: "/compose", params: { accountId: account.id } } : "/compose",
          )
        }
      />
      {focused && <Snackbar />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Clips the bar sliding up under the status bar.
  content: { flex: 1, overflow: "hidden" },
  // Above the rows of the list (FlashList lays them out with their own stacking order).
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: TOP_BAR_HEIGHT, zIndex: 1 },
});
