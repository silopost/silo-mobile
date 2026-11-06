import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, List, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { metaQuery } from "../api/queries/meta";
import { testAccount, testFailure, useCreateAccount } from "../api/queries/accounts";
import type { CreateAccount, TestResult, TlsMode } from "../api/types";
import { accountError } from "../features/accounts/errors";
import { TestResults } from "../features/accounts/TestResults";
import { SettingsSnackbar } from "../features/settings/SettingsSnackbar";
import { t } from "../lib/i18n";
import { INBOX_SLUG } from "../lib/labels";
import { MIN_TOUCH, useAppTheme } from "../lib/theme";
import { useAuth } from "../state/auth";
import { toast } from "../state/toasts";

const tlsModes: TlsMode[] = ["implicit", "starttls", "none"];

type Server = { host: string; port: string; tls: TlsMode };

/** A port typed by the user: undefined when empty, NaN when not a valid port. */
function parsePort(text: string): number | undefined {
  const s = text.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : NaN;
}

function ServerFields(props: {
  name: "imap" | "smtp";
  title: string;
  value: Server;
  onChange: (v: Server) => void;
  portError: boolean;
}) {
  const { name, title, value, onChange, portError } = props;
  return (
    <View style={styles.server}>
      <TextInput
        mode="outlined"
        label={title}
        accessibilityLabel={title}
        value={value.host}
        onChangeText={(host) => onChange({ ...value, host })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        testID={`${name}-host`}
      />
      <TextInput
        mode="outlined"
        label={`${t.port} ${name.toUpperCase()}`}
        accessibilityLabel={`${t.port} ${name.toUpperCase()}`}
        value={value.port}
        onChangeText={(port) => onChange({ ...value, port })}
        keyboardType="number-pad"
        error={portError}
        testID={`${name}-port`}
      />
      {portError && (
        <HelperText type="error" visible>
          {t.invalidPort}
        </HelperText>
      )}
      <Text variant="labelLarge">{`${t.security} ${name.toUpperCase()}`}</Text>
      <SegmentedButtons
        value={value.tls}
        onValueChange={(tls) => onChange({ ...value, tls: tls as TlsMode })}
        buttons={tlsModes.map((m) => ({
          value: m,
          label: t.tlsModes[m],
          accessibilityLabel: `${t.security} ${name.toUpperCase()}: ${t.tlsModes[m]}`,
          style: styles.touch,
        }))}
      />
    </View>
  );
}

/**
 * "Dodaj konto → Inne" of the Gmail app in one form: address, password, display name and the
 * advanced settings (login, IMAP/SMTP servers when the instance allows other servers, GET
 * /meta.allowCustomServers). "Sprawdź połączenie" runs POST /accounts/test; "Dodaj" runs POST
 * /accounts, which tests again and answers 422 account_test_failed with the same steps.
 */
export function AddAccountScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const serverUrl = useAuth((s) => s.serverUrl) ?? "";
  const meta = useQuery({ ...metaQuery(serverUrl), enabled: !!serverUrl });
  const custom = meta.data?.allowCustomServers === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidden, setHidden] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [username, setUsername] = useState("");
  const [imap, setImap] = useState<Server>({ host: "", port: "", tls: "implicit" });
  const [smtp, setSmtp] = useState<Server>({ host: "", port: "", tls: "implicit" });
  const [missing, setMissing] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const create = useCreateAccount();
  const test = useMutation({ mutationFn: testAccount });

  const imapPort = parsePort(imap.port);
  const smtpPort = parsePort(smtp.port);
  const portsInvalid = custom && (Number.isNaN(imapPort) || Number.isNaN(smtpPort));

  /** The request body: only what the user filled in; the server fills the defaults. */
  const body = (): CreateAccount => {
    const b: CreateAccount = { email: email.trim(), password };
    if (displayName.trim()) b.displayName = displayName.trim();
    if (username.trim()) b.username = username.trim();
    if (custom) {
      if (imap.host.trim()) {
        b.imapHost = imap.host.trim();
        b.imapTls = imap.tls;
        if (imapPort) b.imapPort = imapPort;
      }
      if (smtp.host.trim()) {
        b.smtpHost = smtp.host.trim();
        b.smtpTls = smtp.tls;
        if (smtpPort) b.smtpPort = smtpPort;
      }
    }
    return b;
  };

  const ready = () => {
    const ok = email.trim() !== "" && password !== "";
    setMissing(!ok);
    return ok && !portsInvalid;
  };

  const runTest = () => {
    if (!ready()) return;
    create.reset();
    setResult(null);
    const { displayName: _name, ...params } = body();
    test.mutate(params, { onSuccess: setResult });
  };

  const add = () => {
    if (!ready()) return;
    test.reset();
    setResult(null);
    create.mutate(body(), {
      onSuccess: (account) => {
        toast(t.accountAdded);
        if (router.canDismiss()) router.dismissAll();
        router.replace(`/u/${account.position}/${INBOX_SLUG}`);
      },
      onError: (err) => setResult(testFailure(err) ?? null),
    });
  };

  const busy = test.isPending || create.isPending;
  const error = create.isError
    ? accountError(create.error)
    : test.isError
      ? accountError(test.error)
      : null;
  const muted = theme.colors.onSurfaceVariant;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="height">
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="bodyMedium" style={{ color: muted }}>
          {t.addAccountIntro}
        </Text>
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
          textContentType="emailAddress"
          error={missing && !email.trim()}
        />
        <TextInput
          mode="outlined"
          label={t.password}
          accessibilityLabel={t.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          error={missing && !password}
          right={
            <TextInput.Icon
              icon={hidden ? "eye-outline" : "eye-off-outline"}
              accessibilityLabel={hidden ? t.showPassword : t.hidePassword}
              onPress={() => setHidden(!hidden)}
            />
          }
        />
        <TextInput
          mode="outlined"
          label={t.displayNameOptional}
          accessibilityLabel={t.displayNameOptional}
          value={displayName}
          onChangeText={setDisplayName}
        />
        {missing && (
          <HelperText type="error" visible accessibilityRole="alert">
            {t.requiredEmailPassword}
          </HelperText>
        )}

        <List.Accordion
          title={t.advanced}
          expanded={advanced}
          onPress={() => setAdvanced(!advanced)}
          style={[styles.accordion, { backgroundColor: theme.colors.background }]}
          testID="advanced"
        >
          <View style={styles.advanced}>
            <TextInput
              mode="outlined"
              label={t.usernameOptional}
              accessibilityLabel={t.usernameOptional}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {custom ? (
              <>
                <ServerFields
                  name="imap"
                  title={t.imapHost}
                  value={imap}
                  onChange={setImap}
                  portError={Number.isNaN(imapPort)}
                />
                <ServerFields
                  name="smtp"
                  title={t.smtpHost}
                  value={smtp}
                  onChange={setSmtp}
                  portError={Number.isNaN(smtpPort)}
                />
              </>
            ) : (
              <Text variant="bodyMedium" style={{ color: muted }} testID="default-server">
                {meta.data ? `${t.defaultServer}. ${t.defaultServerNoCustom}` : t.defaultServer}
              </Text>
            )}
          </View>
        </List.Accordion>

        {!!error && (
          <View accessibilityRole="alert" testID="add-account-error">
            <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
              {error.message}
            </Text>
            {!!error.detail && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {error.detail}
              </Text>
            )}
          </View>
        )}
        {result && <TestResults result={result} />}

        <View style={styles.buttons}>
          <Button
            mode="outlined"
            onPress={runTest}
            loading={test.isPending}
            disabled={busy}
            contentStyle={styles.touch}
          >
            {test.isPending ? t.testing : t.testConnection}
          </Button>
          <Button
            mode="contained"
            onPress={add}
            loading={create.isPending}
            disabled={busy}
            contentStyle={styles.touch}
            testID="add-account-submit"
          >
            {create.isPending ? t.adding : t.add}
          </Button>
        </View>
      </ScrollView>
      <SettingsSnackbar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  accordion: { paddingHorizontal: 0, minHeight: MIN_TOUCH },
  advanced: { gap: 12 },
  server: { gap: 8 },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  touch: { minHeight: MIN_TOUCH },
});
