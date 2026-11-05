import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Icon, ProgressBar, Text } from "react-native-paper";
import { formatNumber } from "../../lib/format";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";
import { useConnection } from "../../state/connection";
import { useActiveAccount } from "../account";
import { isInitialSync, progressPercent, useResync, useSyncStatus } from "./useSync";

type BannerProps = {
  icon: string;
  text: string;
  background: string;
  color: string;
  action?: { label: string; onPress: () => void; disabled?: boolean };
  testID: string;
};

/** A full-width MD3 banner above the list: icon, text and an optional text button. */
function Banner({ icon, text, background, color, action, testID }: BannerProps) {
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: background }]}
    >
      <Icon source={icon} size={20} color={color} />
      <Text variant="bodyMedium" style={[styles.text, { color }]}>
        {text}
      </Text>
      {action && (
        <Button
          mode="text"
          compact
          textColor={color}
          disabled={action.disabled}
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      )}
    </View>
  );
}

/** Mail server offline or password rejected (plan 5.7); reading and actions keep working. */
function AccountErrorBanner() {
  const theme = useAppTheme();
  const router = useRouter();
  const status = useSyncStatus();
  const account = useActiveAccount();
  const resync = useResync();
  if (status?.state === "auth_failed") {
    return (
      <Banner
        testID="banner-auth-failed"
        icon="key-alert-outline"
        text={t.authFailedBanner}
        background={theme.colors.errorContainer}
        color={theme.colors.onErrorContainer}
        // Updating the password (PATCH /accounts/{id}) is in the account settings.
        action={{ label: t.updatePassword, onPress: () => router.push("/settings") }}
      />
    );
  }
  if (status?.state !== "backoff") return null;
  const host = account?.imapHost ?? status.email;
  const pending = status.pendingOps > 0 ? ` ${t.pendingOps(status.pendingOps)}` : "";
  return (
    <Banner
      testID="banner-backoff"
      icon="cloud-off-outline"
      text={`${t.mailServerOffline(host)}${pending}`}
      background={theme.colors.tertiaryContainer}
      color={theme.colors.onTertiaryContainer}
      action={{ label: t.retryNow, onPress: () => resync.mutate(), disabled: resync.isPending }}
    />
  );
}

/**
 * Silo itself does not answer (the event stream and /meta fail), as silo-web's OfflineBanner. The
 * cached mail stays readable; the stream keeps reconnecting. Nothing is shown while polling.
 */
function OfflineBanner() {
  const theme = useAppTheme();
  const offline = useConnection((s) => s.state === "offline");
  if (!offline) return null;
  return (
    <Banner
      testID="banner-offline"
      icon="server-network-off"
      text={t.siloOffline}
      background={theme.colors.surfaceContainerHigh}
      color={theme.colors.onSurface}
    />
  );
}

/** Progress of the first synchronisation of the account. */
function InitialSyncBanner() {
  const theme = useAppTheme();
  const status = useSyncStatus();
  if (!status || !isInitialSync(status)) return null;
  const { messagesDone, messagesTotal } = status.initialSync;
  const pct = progressPercent(status);
  return (
    <View
      testID="banner-initial-sync"
      style={[styles.progress, { backgroundColor: theme.colors.surfaceContainerLow }]}
    >
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {t.initialSync(formatNumber(messagesDone), formatNumber(messagesTotal))}
      </Text>
      <ProgressBar
        accessibilityLabel={t.initialSyncLabel}
        progress={(pct ?? 0) / 100}
        indeterminate={pct === null}
        color={theme.colors.primary}
        style={styles.bar}
      />
    </View>
  );
}

/** Banners above the list (plan 6.3), announced politely (plan 6.7). */
export function Banners() {
  return (
    <View accessibilityLiveRegion="polite">
      <OfflineBanner />
      <AccountErrorBanner />
      <InitialSyncBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 48,
  },
  text: { flex: 1 },
  progress: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  bar: { height: 4, borderRadius: 2 },
});
