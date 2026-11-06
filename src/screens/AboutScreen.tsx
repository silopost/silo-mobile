import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, StyleSheet } from "react-native";
import { Divider } from "react-native-paper";
import { silo, version } from "../../package.json";
import { logout } from "../api/auth";
import { metaQuery } from "../api/queries/meta";
import { SectionTitle, SettingsItem } from "../features/settings/items";
import { formatSize } from "../lib/format";
import { t } from "../lib/i18n";
import { useAppTheme } from "../lib/theme";
import { useAuth } from "../state/auth";

/** Source of this app (AGPL-3.0: users of the app may get its source). */
export const SOURCE_URL = "https://github.com/silopost/silo-mobile";

/**
 * "O aplikacji": the versions of the app, of the API contract it was built against and of the
 * server (GET /meta), the license with the source, sessions and devices, sign-out.
 */
export function AboutScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const serverUrl = useAuth((s) => s.serverUrl) ?? "";
  const meta = useQuery({ ...metaQuery(serverUrl), enabled: !!serverUrl });
  const signOut = useMutation({ mutationFn: logout });
  const m = meta.data;
  const pending = meta.isPending ? t.loading : t.serverUnreachable;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <SectionTitle>{t.appName}</SectionTitle>
      <SettingsItem
        title={t.appVersion}
        description={version}
        icon="cellphone"
        testID="about-app"
      />
      <SettingsItem
        title={t.apiContract}
        description={`silo-server ${silo.serverRef}`}
        icon="file-document-outline"
        testID="about-contract"
      />
      <SettingsItem
        title={t.license}
        description={t.licenseValue}
        icon="scale-balance"
        role="link"
        testID="about-license"
        onPress={() => void WebBrowser.openBrowserAsync(SOURCE_URL).catch(() => undefined)}
      />
      <Divider />

      <SectionTitle>{t.serverTitle}</SectionTitle>
      <SettingsItem
        title={t.serverAddressTitle}
        description={serverUrl}
        icon="server"
        testID="about-server"
      />
      <SettingsItem
        title={t.serverVersion}
        description={m?.serverVersion ?? pending}
        icon="tag-outline"
        testID="about-server-version"
      />
      <SettingsItem
        title={t.apiVersion}
        description={m?.apiVersion ?? pending}
        icon="api"
        testID="about-api-version"
      />
      <SettingsItem
        title={t.authModeTitle}
        description={m ? t.authModes[m.authMode] : pending}
        icon="login"
        testID="about-auth-mode"
      />
      <SettingsItem
        title={t.attachmentLimit}
        description={m ? formatSize(m.maxAttachmentBytes) : pending}
        icon="paperclip"
        testID="about-attachments"
      />
      <Divider />

      <SettingsItem
        title={t.sessionsAndDevices}
        icon="cellphone-link"
        role="link"
        testID="about-sessions"
        onPress={() => router.push("/settings/sessions")}
      />
      <SettingsItem
        title={signOut.isPending ? t.signingOut : t.signOut}
        icon="logout"
        testID="about-sign-out"
        disabled={signOut.isPending}
        onPress={() => signOut.mutate()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
});
