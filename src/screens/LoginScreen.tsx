import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { defaultDeviceName, login } from "../api/auth";
import { isApiError } from "../api/errors";
import { metaQuery } from "../api/queries/meta";
import { t } from "../lib/i18n";
import { normalizeServerUrl } from "../lib/serverUrl";
import { MIN_TOUCH } from "../lib/theme";
import { useAuth } from "../state/auth";

/** Message for a failed sign-in (plan 5.3 codes). */
export function loginErrorText(err: unknown): string {
  if (isApiError(err, 401)) return t.invalidCredentials;
  if (isApiError(err, 429)) return t.rateLimited(err.retryAfter);
  if (isApiError(err, 502) && err.code === "upstream_imap_error") return t.mailServerUnavailable;
  if (isApiError(err)) return t.genericError;
  return t.serverUnreachable;
}

/** Waits until typing stops before the address is checked with GET /meta. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function ServerInfo({ serverUrl }: { serverUrl: string }) {
  const meta = useQuery(metaQuery(serverUrl));
  const text = meta.isPending
    ? t.checkingServer
    : meta.isError
      ? loginErrorText(meta.error)
      : t.serverInfo(meta.data.serverVersion);
  return (
    <HelperText
      type={meta.isError ? "error" : "info"}
      visible
      accessibilityLiveRegion="polite"
      testID="server-info"
    >
      {text}
    </HelperText>
  );
}

export function LoginScreen() {
  const storedServerUrl = useAuth((s) => s.serverUrl);
  const [server, setServer] = useState(storedServerUrl ?? "https://");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverTouched, setServerTouched] = useState(false);

  const serverUrl = normalizeServerUrl(server);
  const checkedUrl = useDebounced(serverUrl, 500);
  const serverInvalid = serverTouched && !serverUrl;

  const signIn = useMutation({
    mutationFn: (url: string) =>
      login({ serverUrl: url, email: email.trim(), password, deviceName: defaultDeviceName() }),
  });

  const canSubmit = !!serverUrl && email.trim() !== "" && password !== "" && !signIn.isPending;
  const submit = () => {
    setServerTouched(true);
    if (canSubmit) signIn.mutate(serverUrl);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="headlineMedium" accessibilityRole="header">
          {t.appName}
        </Text>
        <View>
          <Text variant="titleLarge">{t.loginTitle}</Text>
          <Text variant="bodyMedium">{t.loginSubtitle}</Text>
        </View>

        <View>
          <TextInput
            mode="outlined"
            label={t.serverUrl}
            accessibilityLabel={t.serverUrl}
            value={server}
            onChangeText={setServer}
            onBlur={() => setServerTouched(true)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            error={serverInvalid}
          />
          {serverInvalid ? (
            <HelperText type="error" visible accessibilityLiveRegion="polite">
              {t.invalidServerUrl}
            </HelperText>
          ) : checkedUrl && checkedUrl === serverUrl ? (
            <ServerInfo serverUrl={checkedUrl} />
          ) : null}
        </View>

        <TextInput
          mode="outlined"
          label={t.email}
          accessibilityLabel={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
        />
        <TextInput
          mode="outlined"
          label={t.password}
          accessibilityLabel={t.password}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
        />

        {signIn.isError && (
          <HelperText type="error" visible accessibilityRole="alert" style={styles.error}>
            {loginErrorText(signIn.error)}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={submit}
          disabled={!canSubmit}
          loading={signIn.isPending}
          accessibilityLabel={t.signIn}
          contentStyle={styles.button}
        >
          {signIn.isPending ? t.signingIn : t.signIn}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: 16, padding: 24 },
  error: { fontSize: 14 },
  button: { minHeight: MIN_TOUCH },
});
