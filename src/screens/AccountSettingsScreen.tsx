import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  Divider,
  Icon,
  Portal,
  ProgressBar,
  Text,
} from "react-native-paper";
import { useAccountResync, useDeleteAccount, useUpdateAccount } from "../api/queries/accounts";
import { syncStatusQuery } from "../api/queries/syncStatus";
import type { Account, Folder, SyncStatus } from "../api/types";
import { Avatar } from "../components/Avatar";
import { defaultAccount, sortedAccounts, useSession } from "../features/account";
import { accountError } from "../features/accounts/errors";
import { SectionTitle, SettingsItem, SwitchItem } from "../features/settings/items";
import { TextDialog } from "../features/settings/TextDialog";
import { SettingsSnackbar } from "../features/settings/SettingsSnackbar";
import { isInitialSync, progressPercent, SYNC_POLL_MS } from "../features/sync/useSync";
import { formatNumber } from "../lib/format";
import { formatDateTime, t } from "../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { useConnection } from "../state/connection";
import { toast } from "../state/toasts";

type DialogKind = "name" | "password" | "remove";

/** The sync line of the account: the state machine of GET /accounts/{id}/sync-status. */
function syncSummary(status: SyncStatus, account: Account): string {
  switch (status.state) {
    case "live":
      return t.syncLive(status.lastSyncAt ? formatDateTime(status.lastSyncAt) : null);
    case "initial_sync":
      return t.syncInitial;
    case "backoff":
      return t.syncBackoff(account.imapHost);
    case "auth_failed":
      return t.syncAuthFailed;
    case "disabled":
      return t.syncDisabled;
    default:
      return t.syncConnecting;
  }
}

function folderDescription(f: Folder): string {
  return [
    t.folderRoles[f.role] ?? f.role,
    t.folderMessages(f.messages),
    f.syncMode === "ignore" ? t.folderIgnored : null,
    f.error,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Settings of one account, as the Gmail app's account screen: the name, the sync state with
 * "Synchronizuj teraz", what the server can do, its folders (read only), the connection, the
 * password and removing the account from Silo (the mailbox stays on the server).
 */
export function AccountSettingsScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const session = useSession();
  const account = sortedAccounts(session).find((a) => a.id === id);
  const streamed = useConnection((s) => s.state === "live" || s.state === "connecting");
  const status = useQuery({
    ...syncStatusQuery(id),
    enabled: !!account,
    // As useSyncStatus: events update it while streaming, otherwise poll until live.
    refetchInterval: (q) => {
      const state = q.state.data?.state;
      return !streamed && state && state !== "live" ? SYNC_POLL_MS : false;
    },
  });
  const update = useUpdateAccount(id);
  const remove = useDeleteAccount();
  const resync = useAccountResync(id);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => {
    update.reset();
    setDialog(null);
  };
  const muted = theme.colors.onSurfaceVariant;

  if (!account) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        {!session || remove.isPending || remove.isSuccess ? (
          <ActivityIndicator accessibilityLabel={t.loading} />
        ) : (
          <Text accessibilityRole="alert">{t.accountNotFound}</Text>
        )}
      </View>
    );
  }

  const save = (body: Parameters<typeof update.mutate>[0], done: string) =>
    update.mutate(body, {
      onSuccess: () => {
        setDialog(null);
        toast(done);
      },
    });

  const runResync = (mode: "incremental" | "full") =>
    resync.mutate(mode, {
      onSuccess: () => toast(t.syncRequested),
      onError: (err) => toast(accountError(err).message),
    });

  const removeAccount = () => {
    const wasActive = defaultAccount(session)?.id === account.id;
    const last = (session?.accounts ?? []).length <= 1;
    remove.mutate(account.id, {
      onSuccess: () => {
        setDialog(null);
        toast(t.accountRemoved);
        // The mail views of a removed account have nothing to show: the start screen opens the
        // next account, or offers to add one when it was the last.
        if (wasActive || last) {
          if (router.canDismiss()) router.dismissAll();
          router.replace("/");
        } else {
          router.back();
        }
      },
    });
  };

  const s = status.data;
  const pct = s ? progressPercent(s) : null;
  const initial = s ? s.state === "initial_sync" || isInitialSync(s) : false;
  const tls = (mode: Account["imapTls"]) => t.tlsModes[mode];

  return (
    <>
      <Stack.Screen options={{ title: account.email }} />
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Avatar address={{ email: account.email, name: account.displayName }} size={56} />
          <View style={styles.headerText}>
            <Text variant="titleLarge" numberOfLines={1}>
              {account.displayName || account.email}
            </Text>
            <Text variant="bodyMedium" numberOfLines={1} style={{ color: muted }}>
              {account.email}
            </Text>
          </View>
        </View>
        <SettingsItem
          title={t.displayName}
          description={account.displayName || t.noDisplayName}
          icon="account-edit-outline"
          testID="account-name"
          onPress={() => setDialog("name")}
        />
        <Divider />

        <SectionTitle>{t.syncTitle}</SectionTitle>
        {status.isPending ? (
          <ActivityIndicator style={styles.spinner} accessibilityLabel={t.loading} />
        ) : !s ? (
          <View style={styles.block}>
            <Text accessibilityRole="alert">{t.genericError}</Text>
            <Button onPress={() => status.refetch()} contentStyle={styles.touch}>
              {t.retry}
            </Button>
          </View>
        ) : (
          <>
            <View
              style={styles.block}
              testID="sync-state"
              accessible
              accessibilityLabel={`${t.syncTitle}: ${syncSummary(s, account)}`}
            >
              <View style={styles.stateRow}>
                <Icon
                  source={
                    s.state === "live"
                      ? "check-circle-outline"
                      : s.state === "auth_failed"
                        ? "key-alert-outline"
                        : s.state === "backoff"
                          ? "cloud-off-outline"
                          : "sync"
                  }
                  size={20}
                  color={
                    s.state === "auth_failed" || s.state === "backoff" ? theme.colors.error : muted
                  }
                />
                <Text variant="bodyLarge" style={styles.flex}>
                  {syncSummary(s, account)}
                </Text>
              </View>
              {initial && (
                <View style={styles.progress}>
                  <ProgressBar
                    accessibilityLabel={t.initialSyncLabel}
                    progress={(pct ?? 0) / 100}
                    indeterminate={pct === null}
                    color={theme.colors.primary}
                  />
                  <Text variant="bodySmall" style={{ color: muted }}>
                    {t.syncInitialProgress(
                      formatNumber(s.initialSync.messagesDone),
                      formatNumber(s.initialSync.messagesTotal),
                    )}
                  </Text>
                </View>
              )}
              {!!s.error && (
                <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                  {s.error}
                </Text>
              )}
              {s.state === "auth_failed" && (
                <Button
                  mode="contained-tonal"
                  onPress={() => setDialog("password")}
                  style={styles.inlineButton}
                  contentStyle={styles.touch}
                >
                  {t.updatePassword}
                </Button>
              )}
            </View>
            <SettingsItem
              title={t.pendingOpsCount(s.pendingOps)}
              icon="cloud-upload-outline"
              testID="pending-ops"
            />
            <SettingsItem
              title={t.deadOpsCount(s.deadOps)}
              description={t.deadOpsHint}
              icon="alert-circle-outline"
              testID="dead-ops"
            />
            <View style={styles.buttons}>
              <Button
                mode="outlined"
                icon="sync"
                onPress={() => runResync("incremental")}
                disabled={resync.isPending}
                contentStyle={styles.touch}
              >
                {t.syncNow}
              </Button>
            </View>
            <SettingsItem
              title={t.fullCompare}
              description={t.fullCompareHint}
              icon="compare-horizontal"
              testID="full-compare"
              disabled={resync.isPending}
              onPress={() => runResync("full")}
            />

            <SectionTitle>{t.capabilitiesTitle}</SectionTitle>
            {!s.keywordsSupported && (
              <View
                style={[styles.warning, { backgroundColor: theme.colors.tertiaryContainer }]}
                accessibilityRole="alert"
                testID="keywords-warning"
              >
                <Icon
                  source="label-off-outline"
                  size={20}
                  color={theme.colors.onTertiaryContainer}
                />
                <Text
                  variant="bodyMedium"
                  style={[styles.flex, { color: theme.colors.onTertiaryContainer }]}
                >
                  {t.keywordsUnsupported}
                </Text>
              </View>
            )}
            <View style={styles.chips} testID="capabilities">
              {(s.capabilities ?? []).map((c) => (
                <Chip key={c} compact accessibilityRole="text">
                  {c}
                </Chip>
              ))}
            </View>

            {(s.folders ?? []).length > 0 && <SectionTitle>{t.foldersTitle}</SectionTitle>}
            {(s.folders ?? []).map((f) => (
              <SettingsItem
                key={f.id}
                title={f.name}
                description={folderDescription(f)}
                icon={f.error ? "folder-alert-outline" : "folder-outline"}
                testID={`folder-${f.id}`}
              />
            ))}
          </>
        )}
        <Divider />

        <SectionTitle>{t.serverTitle}</SectionTitle>
        <SettingsItem
          title={t.incomingServer}
          description={t.serverAddress(account.imapHost, account.imapPort, tls(account.imapTls))}
          icon="inbox-arrow-down-outline"
        />
        <SettingsItem
          title={t.outgoingServer}
          description={t.serverAddress(account.smtpHost, account.smtpPort, tls(account.smtpTls))}
          icon="send-outline"
        />
        <SettingsItem title={t.username} description={account.username} icon="account-outline" />
        <SwitchItem
          title={t.sentAppend}
          description={t.sentAppendHint}
          icon="content-save-outline"
          value={account.sentAppend}
          disabled={update.isPending}
          onValueChange={(sentAppend) =>
            update.mutate({ sentAppend }, { onError: (err) => toast(accountError(err).message) })
          }
          testID="sent-append"
        />
        <SettingsItem
          title={t.changePassword}
          description={t.changePasswordHint}
          icon="form-textbox-password"
          testID="change-password"
          onPress={() => setDialog("password")}
        />
        <Divider />
        <SettingsItem
          title={t.removeAccount}
          icon="account-remove-outline"
          testID="remove-account"
          onPress={() => setDialog("remove")}
        />
      </ScrollView>
      <SettingsSnackbar />

      {dialog === "name" && (
        <TextDialog
          testID="name-dialog"
          title={t.displayName}
          description={t.displayNameHint}
          label={t.displayName}
          initial={account.displayName}
          allowEmpty
          busy={update.isPending}
          error={update.isError ? accountError(update.error) : null}
          onSubmit={(displayName) => save({ displayName: displayName.trim() }, t.saved)}
          onDismiss={close}
        />
      )}
      {dialog === "password" && (
        <TextDialog
          testID="password-dialog"
          title={t.changePassword}
          description={t.changePasswordHint}
          label={t.newPassword}
          secure
          busy={update.isPending}
          error={update.isError ? accountError(update.error) : null}
          onSubmit={(password) => save({ password }, t.passwordChanged)}
          onDismiss={close}
        />
      )}
      {dialog === "remove" && (
        <Portal>
          <Dialog
            visible
            onDismiss={remove.isPending ? undefined : () => setDialog(null)}
            testID="remove-dialog"
          >
            <Dialog.Title>{t.removeAccountTitle}</Dialog.Title>
            <Dialog.Content style={styles.dialogContent}>
              <Text variant="bodyMedium">{t.removeAccountBody}</Text>
              {remove.isError && (
                <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                  {accountError(remove.error).message}
                </Text>
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => setDialog(null)}
                disabled={remove.isPending}
                contentStyle={styles.touch}
              >
                {t.cancel}
              </Button>
              <Button
                onPress={removeAccount}
                loading={remove.isPending}
                disabled={remove.isPending}
                textColor={theme.colors.error}
                contentStyle={styles.touch}
                testID="remove-confirm"
              >
                {t.remove}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16 },
  headerText: { flex: 1 },
  spinner: { padding: 16 },
  block: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progress: { gap: 4 },
  flex: { flex: 1 },
  inlineButton: { alignSelf: "flex-start" },
  buttons: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  touch: { minHeight: MIN_TOUCH },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  dialogContent: { gap: 8 },
});
