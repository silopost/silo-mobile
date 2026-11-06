import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  List,
  Portal,
  Text,
} from "react-native-paper";
import { logout, logoutEverywhere } from "../api/auth";
import { isApiError } from "../api/errors";
import { sessionsQuery, useRevokeSession } from "../api/queries/sessions";
import type { components } from "../api/schema";
import { formatDateTime, t } from "../lib/i18n";
import { MIN_TOUCH } from "../lib/theme";

type SessionInfo = components["schemas"]["SessionInfo"];

/** What the user recognises a session by: the device name, else the browser's user agent. */
function sessionName(s: SessionInfo): string {
  return s.clientName || s.userAgent || t.unknownBrowser;
}

function sessionDescription(s: SessionInfo): string {
  return [
    s.current ? `${t.sessionKinds[s.kind]} · ${t.thisDevice}` : t.sessionKinds[s.kind],
    t.lastSeenAt(formatDateTime(s.lastSeenAt)),
    t.signedInAt(formatDateTime(s.createdAt)),
  ].join("\n");
}

export function SessionsScreen() {
  const sessions = useQuery(sessionsQuery);
  const revoke = useRevokeSession();
  const [confirming, setConfirming] = useState<SessionInfo | null>(null);
  const signOut = useMutation({ mutationFn: logout });
  const everywhere = useMutation({ mutationFn: logoutEverywhere });
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);
  const busy = signOut.isPending || everywhere.isPending;

  const confirmRevoke = () => {
    if (confirming) revoke.mutate(confirming.id);
    setConfirming(null);
  };

  if (sessions.isPending) {
    return <ActivityIndicator style={styles.center} accessibilityLabel={t.loading} />;
  }
  if (sessions.isError) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert">
          {isApiError(sessions.error) ? t.genericError : t.serverUnreachable}
        </Text>
        <Button onPress={() => sessions.refetch()} contentStyle={styles.touch}>
          {t.retry}
        </Button>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={sessions.data}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.empty}>{t.noSessions}</Text>}
        renderItem={({ item }) => (
          <List.Item
            title={sessionName(item)}
            titleNumberOfLines={2}
            description={sessionDescription(item)}
            descriptionNumberOfLines={3}
            accessibilityLabel={`${sessionName(item)}, ${sessionDescription(item)}`}
            testID={`session-${item.id}`}
            left={(props) => (
              <List.Icon {...props} icon={item.kind === "bearer" ? "cellphone" : "web"} />
            )}
            right={() =>
              item.current ? null : (
                <Button
                  onPress={() => setConfirming(item)}
                  accessibilityLabel={t.revokeLabel(sessionName(item))}
                  contentStyle={styles.touch}
                  style={styles.revoke}
                >
                  {t.revoke}
                </Button>
              )
            }
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {(revoke.isError || everywhere.isError) && (
              <HelperText type="error" visible accessibilityRole="alert">
                {t.genericError}
              </HelperText>
            )}
            <Button
              mode="outlined"
              onPress={() => signOut.mutate()}
              loading={signOut.isPending}
              disabled={busy}
              accessibilityLabel={t.signOut}
              contentStyle={styles.touch}
            >
              {signOut.isPending ? t.signingOut : t.signOut}
            </Button>
            <Button
              mode="text"
              onPress={() => setConfirmEverywhere(true)}
              loading={everywhere.isPending}
              disabled={busy}
              accessibilityLabel={t.signOutEverywhere}
              contentStyle={styles.touch}
            >
              {everywhere.isPending ? t.signingOut : t.signOutEverywhere}
            </Button>
          </View>
        }
      />
      <Portal>
        {confirmEverywhere && (
          <Dialog visible onDismiss={() => setConfirmEverywhere(false)} testID="everywhere-dialog">
            <Dialog.Title>{t.signOutEverywhereTitle}</Dialog.Title>
            <Dialog.Content>
              <Text>{t.signOutEverywhereBody}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmEverywhere(false)} contentStyle={styles.touch}>
                {t.cancel}
              </Button>
              <Button
                onPress={() => {
                  setConfirmEverywhere(false);
                  everywhere.mutate();
                }}
                contentStyle={styles.touch}
                testID="confirm-everywhere"
              >
                {t.signOutEverywhere}
              </Button>
            </Dialog.Actions>
          </Dialog>
        )}
        <Dialog visible={confirming !== null} onDismiss={() => setConfirming(null)}>
          <Dialog.Title>{t.revokeTitle}</Dialog.Title>
          <Dialog.Content>
            <Text>{confirming ? t.revokeBody(sessionName(confirming)) : ""}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(null)} contentStyle={styles.touch}>
              {t.cancel}
            </Button>
            <Button onPress={confirmRevoke} contentStyle={styles.touch} testID="confirm-revoke">
              {t.revoke}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  empty: { padding: 16 },
  footer: { padding: 16, gap: 8 },
  touch: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
  revoke: { alignSelf: "center" },
});
