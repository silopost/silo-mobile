import { StyleSheet, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import type { ProtocolResult, TestResult } from "../../api/types";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";

function Protocol({ name, result }: { name: string; result: ProtocolResult }) {
  const theme = useAppTheme();
  const ok = theme.colors.primary;
  const bad = theme.colors.error;
  return (
    <View style={styles.protocol} testID={`test-${name.toLowerCase()}`}>
      <Text variant="titleSmall" accessibilityRole="header">
        {`${name}: ${result.ok ? t.testOk : t.testFailed}`}
      </Text>
      {(result.steps ?? []).map((s, i) => {
        const label = t.steps[s.step] ?? s.step;
        return (
          <View
            key={`${s.step}-${i}`}
            style={styles.step}
            accessible
            accessibilityLabel={`${label}: ${s.ok ? t.stepOk : t.stepFailed}${s.detail ? `, ${s.detail}` : ""}`}
            testID={`step-${name.toLowerCase()}-${s.step}`}
          >
            <Icon
              source={s.ok ? "check-circle-outline" : "close-circle-outline"}
              size={20}
              color={s.ok ? ok : bad}
            />
            <View style={styles.text}>
              <Text variant="bodyMedium">{`${s.ok ? "✓" : "✗"} ${label}`}</Text>
              {!!s.detail && (
                <Text
                  variant="bodySmall"
                  style={{ color: s.ok ? theme.colors.onSurfaceVariant : bad }}
                >
                  {s.detail}
                </Text>
              )}
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {`${s.ms} ms`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * The steps of a connection test (POST /accounts/test, or `test` of 422 account_test_failed), per
 * protocol, as plan 5.2 shows them: ✓/✗, the step, the server's detail and the time.
 */
export function TestResults({ result }: { result: TestResult }) {
  return (
    <View style={styles.root} testID="test-results">
      <Protocol name="IMAP" result={result.imap} />
      <Protocol name="SMTP" result={result.smtp} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  protocol: { gap: 6 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  text: { flex: 1 },
});
