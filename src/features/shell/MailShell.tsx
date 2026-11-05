import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../lib/theme";
import { Snackbar } from "../toasts/Snackbar";
import { MailTopBar } from "../topbar/MailTopBar";
import { ComposeFab } from "./ComposeFab";

type Props = {
  /** Section title above the content (Gmail shows none in the Inbox). */
  title?: string;
  /** Collapses the FAB to its icon (see ComposeFab). */
  fabExtended?: boolean;
  children: ReactNode;
};

/** Frame of the mail views: search bar, optional section title, content, compose FAB, snackbar. */
export function MailShell({ title, fabExtended = true, children }: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <MailTopBar />
      {title !== undefined && (
        <Text
          variant="labelLarge"
          accessibilityRole="header"
          style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
        >
          {title}
        </Text>
      )}
      <View style={styles.content}>{children}</View>
      <ComposeFab extended={fabExtended} onPress={() => router.push("/compose")} />
      <Snackbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  content: { flex: 1 },
});
