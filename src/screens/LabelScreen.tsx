import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useLabels } from "../api/queries/labels";
import { useAccountIndex, useActiveAccount } from "../features/account";
import { MailShell } from "../features/shell/MailShell";
import { Banners } from "../features/sync/Banners";
import { SelectionBar } from "../features/threadlist/SelectionBar";
import { ThreadList } from "../features/threadlist/ThreadList";
import { t } from "../lib/i18n";
import { INBOX_SLUG, resolveLabelSlug, viewName, type ResolvedLabel } from "../lib/labels";
import { useAppTheme } from "../lib/theme";
import { useSelection } from "../state/selection";

/** Empty view of a label, as in the Gmail app. */
function emptyState(r: ResolvedLabel): { text: string; icon: string } {
  if (r.kind !== "system") return { text: t.emptyView, icon: "label-outline" };
  switch (r.view.labelId) {
    case "INBOX":
      return { text: t.emptyInbox, icon: "inbox" };
    case "SPAM":
      return { text: t.emptySpam, icon: "alert-octagon-outline" };
    case "TRASH":
      return { text: t.emptyTrash, icon: "delete-outline" };
    default:
      return { text: t.emptyView, icon: r.view.icon };
  }
}

/** The thread list of a label (/u/<n>/<label>). */
export function LabelScreen() {
  const { label = "" } = useLocalSearchParams<{ label: string }>();
  const account = useActiveAccount();
  const index = useAccountIndex();
  const labels = useLabels(account?.id);
  const theme = useAppTheme();
  const resolved = resolveLabelSlug(label);
  const known = resolved.kind !== "unknown";
  const labelId =
    resolved.kind === "system"
      ? resolved.view.labelId
      : resolved.kind === "label"
        ? resolved.labelId
        : undefined;
  const [fabExtended, setFabExtended] = useState(true);
  const selecting = useSelection((s) => s.ids.size > 0);
  const filter = { labelId };
  const threadHref = useCallback((id: string) => `/u/${index}/${label}/${id}`, [index, label]);

  // A selection belongs to one list: leaving the label or the account ends it.
  useEffect(() => {
    const clear = () => useSelection.getState().clear();
    clear();
    return clear;
  }, [label, account?.id]);

  return (
    // Gmail names the section above the list everywhere but in the Inbox.
    <MailShell
      title={label === INBOX_SLUG ? undefined : known ? viewName(label, labels) : t.unknownLabel}
      fabExtended={fabExtended}
      topBar={
        selecting && account ? <SelectionBar accountId={account.id} filter={filter} /> : undefined
      }
    >
      {known && account ? (
        <>
          <Banners />
          <ThreadList
            // A new list (label or account) starts at the top with the FAB extended.
            key={`${account.id}/${label}`}
            accountId={account.id}
            filter={filter}
            me={{ email: account.email, name: account.displayName }}
            threadHref={threadHref}
            empty={emptyState(resolved)}
            onFabExtendedChange={setFabExtended}
          />
        </>
      ) : (
        <View style={styles.center}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {known ? t.loading : t.unknownLabel}
          </Text>
        </View>
      )}
    </MailShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
