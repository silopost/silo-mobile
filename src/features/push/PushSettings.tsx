import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, Dialog, Portal, Text, TouchableRipple } from "react-native-paper";
import { isApiError } from "../../api/errors";
import { keys } from "../../api/keys";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { usePush } from "../../state/push";
import { toast } from "../../state/toasts";
import { sortedAccounts, useSession, type Account } from "../account";
import { SettingsItem, SwitchItem } from "../settings/items";
import { getCurrentDevice } from "./api";
import {
  disablePush,
  enablePush,
  PushTokenError,
  registerAgain,
  setPushAccounts,
} from "./register";
import { usePushUnavailable } from "./usePushNotifications";

/** What went wrong while switching push or saving the accounts, for the snackbar. */
function pushErrorMessage(err: unknown): string {
  if (err instanceof PushTokenError) return t.pushTokenFailed;
  if (isApiError(err)) {
    if (err.code === "push_disabled") return t.pushServerDisabled;
    if (err.code === "invalid_account") return t.pushInvalidAccount;
    return t.genericError;
  }
  return t.serverUnreachable;
}

type AccountsDialogProps = {
  accounts: Account[];
  /** null: every account. */
  value: string[] | null;
  onSave: (accountIds: string[] | null) => void;
  onDismiss: () => void;
};

/** Check boxes of the user's accounts; all checked is saved as "every account" (null). */
function AccountsDialog({ accounts, value, onSave, onDismiss }: AccountsDialogProps) {
  const theme = useAppTheme();
  const [checked, setChecked] = useState(() => new Set(value ?? accounts.map((a) => a.id)));
  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const chosen = accounts.filter((a) => checked.has(a.id)).map((a) => a.id);
  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss} testID="push-accounts-dialog">
        <Dialog.Title>{t.pushAccounts}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scroll}>
          <ScrollView>
            <Text
              variant="bodySmall"
              style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
            >
              {t.pushAccountsHint}
            </Text>
            {accounts.map((a) => (
              <TouchableRipple
                key={a.id}
                onPress={() => toggle(a.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: checked.has(a.id) }}
                accessibilityLabel={a.email}
                testID={`push-account-${a.id}`}
                style={styles.row}
              >
                <View style={styles.rowInner} importantForAccessibility="no-hide-descendants">
                  <Checkbox.Android status={checked.has(a.id) ? "checked" : "unchecked"} />
                  <Text variant="bodyLarge" style={styles.rowText}>
                    {a.email}
                  </Text>
                </View>
              </TouchableRipple>
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} contentStyle={styles.touch}>
            {t.cancel}
          </Button>
          <Button
            onPress={() => onSave(chosen.length === accounts.length ? null : chosen)}
            disabled={chosen.length === 0}
            contentStyle={styles.touch}
            testID="push-accounts-save"
          >
            {t.pushAccountsSave}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

/**
 * "Powiadomienia" of the general settings: switching new-mail push on and off for this device,
 * the accounts it covers and the last delivery error the server reports. Inactive, with the
 * reason, when the server does not push or this build has no push configuration.
 */
export function PushSettings() {
  const theme = useAppTheme();
  const unavailable = usePushUnavailable();
  const { enabled, accountIds } = usePush();
  const accounts = sortedAccounts(useSession());
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);

  const device = useQuery({
    queryKey: keys.pushDevice,
    queryFn: ({ signal }) => getCurrentDevice(signal),
    enabled: unavailable === null && enabled && !busy,
    retry: false,
  });
  // The server no longer has the device (Expo reported the token as invalid): register again.
  const gone = enabled && isApiError(device.error, 404);
  useEffect(() => {
    if (gone) void registerAgain().then(() => device.refetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per 404
  }, [gone]);

  if (unavailable) {
    return (
      <SettingsItem
        title={t.pushNewMail}
        description={t.pushUnavailable[unavailable]}
        icon="bell-off-outline"
        disabled
        testID="setting-push"
      />
    );
  }

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (err) {
      toast(pushErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const toggle = (on: boolean) =>
    run(async () => {
      if (!on) return disablePush();
      if ((await enablePush(accountIds)) === "denied") toast(t.pushPermissionDenied);
    });

  const known = accountIds?.filter((id) => accounts.some((a) => a.id === id));
  const lastError = enabled ? device.data?.lastError : null;
  return (
    <>
      <SwitchItem
        title={t.pushNewMail}
        description={enabled ? t.pushOnDescription : t.off}
        icon={enabled ? "bell-outline" : "bell-off-outline"}
        value={enabled}
        onValueChange={(on) => void toggle(on)}
        disabled={busy}
        testID="setting-push"
      />
      {enabled && accounts.length > 1 && (
        <SettingsItem
          title={t.pushAccounts}
          description={
            known ? t.pushSomeAccounts(known.length, accounts.length) : t.pushAllAccounts
          }
          icon="account-multiple-outline"
          disabled={busy}
          onPress={() => setDialog(true)}
          testID="setting-push-accounts"
        />
      )}
      {!!lastError && (
        <Text
          variant="bodySmall"
          accessibilityRole="alert"
          style={[styles.error, { color: theme.colors.error }]}
          testID="push-last-error"
        >
          {t.pushLastError(lastError)}
        </Text>
      )}
      {dialog && (
        <AccountsDialog
          accounts={accounts}
          value={known ?? null}
          onDismiss={() => setDialog(false)}
          onSave={(ids) => {
            setDialog(false);
            void run(() => setPushAccounts(ids));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 0 },
  hint: { paddingHorizontal: 24, paddingBottom: 8 },
  row: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: 16 },
  rowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { flex: 1 },
  error: { paddingHorizontal: 16, paddingBottom: 8 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
});
