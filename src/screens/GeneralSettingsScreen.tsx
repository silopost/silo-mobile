import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, Icon, Text } from "react-native-paper";
import { usePatchSettings, useSettings } from "../api/queries/settings";
import { ChoiceDialog, SectionTitle, SettingsItem, SwitchItem } from "../features/settings/items";
import { SettingsSnackbar } from "../features/settings/SettingsSnackbar";
import { TextDialog } from "../features/settings/TextDialog";
import { deviceTimeZone, TimezoneDialog } from "../features/settings/TimezoneDialog";
import { swipeLook } from "../features/threadlist/SwipeableRow";
import { useServerFeature } from "../lib/features";
import { t } from "../lib/i18n";
import { signatureToText, textToSignatureHtml } from "../lib/signature";
import { useAppTheme } from "../lib/theme";
import {
  setConfirmArchive,
  setConfirmTrash,
  setDensity,
  setMarkReadOnOpen,
  setShowRemoteImages,
  setSwipeActions,
  setTheme,
  useUi,
  type Density,
  type RemoteImages,
  type SwipeAction,
  type ThemePreference,
} from "../state/ui";

type DialogKind =
  | "theme"
  | "density"
  | "swipeRight"
  | "swipeLeft"
  | "images"
  | "undoSend"
  | "signature"
  | "timezone";

const themes: ThemePreference[] = ["system", "light", "dark"];
/** The densities of a 0.3.0 server (device only) and of /settings (Gmail web's three). */
const localDensities: Density[] = ["default", "compact"];
const serverDensities: Density[] = ["default", "comfortable", "compact"];
/** The values PATCH /settings accepts for undoSendSeconds. */
const undoSendChoices = ["5", "10", "20", "30"] as const;
const swipeActions: SwipeAction[] = ["archive", "trash", "snooze", "none"];
const imageModes: RemoteImages[] = ["ask", "always"];

/** The coloured circle of a swipe action: what the row reveals (Gmail's swipe settings). */
function SwipePreview({ action }: { action: SwipeAction }) {
  const theme = useAppTheme();
  const look =
    action === "none" ? { color: theme.colors.surfaceVariant, icon: "close" } : swipeLook(action);
  return (
    <View
      style={[styles.preview, { backgroundColor: look.color }]}
      testID={`swipe-preview-${action}`}
    >
      <Icon
        source={look.icon}
        size={20}
        color={action === "none" ? theme.colors.onSurfaceVariant : "#ffffff"}
      />
    </View>
  );
}

/**
 * "Ustawienia ogólne" of the Gmail app. With server 0.4.0 the section "Konto Silo
 * (synchronizowane)" edits GET/PATCH /settings (density, undo-send time, signature, time zone),
 * shared by every device; the rest stays on this device (useUi), as all of it does with 0.3.0.
 * Every entry shows its current value under the title; choices open a radio dialog, booleans are
 * switches.
 */
export function GeneralSettingsScreen() {
  const theme = useAppTheme();
  const ui = useUi();
  const synced = useServerFeature("settings");
  const settings = useSettings();
  const patch = usePatchSettings();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);
  const pick =
    <T,>(apply: (v: T) => void) =>
    (v: T) => {
      apply(v);
      close();
    };

  // Odłóż needs server 0.4.0 (snooze).
  const snooze = useServerFeature("snooze");
  const swipeChoices = swipeActions
    .filter((value) => value !== "snooze" || snooze)
    .map((value) => ({
      value,
      label: t.swipeActions[value],
      left: <SwipePreview action={value} />,
    }));

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        {synced && settings && (
          <>
            <SectionTitle>{t.syncedSection}</SectionTitle>
            <Text
              variant="bodySmall"
              style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
            >
              {t.syncedNote}
            </Text>
            <SettingsItem
              title={t.densityTitle}
              description={t.densities[settings.density]}
              icon="format-line-spacing"
              testID="setting-density"
              onPress={() => setDialog("density")}
            />
            <SettingsItem
              title={t.undoSendTitle}
              description={t.undoSendSeconds(settings.undoSendSeconds)}
              icon="undo-variant"
              testID="setting-undo-send"
              onPress={() => setDialog("undoSend")}
            />
            <SettingsItem
              title={t.signatureTitle}
              description={signatureToText(settings.signature) || t.signatureNone}
              icon="draw-pen"
              testID="setting-signature"
              onPress={() => setDialog("signature")}
            />
            <SettingsItem
              title={t.timezoneTitle}
              description={
                settings.timezone === deviceTimeZone()
                  ? settings.timezone
                  : `${settings.timezone || "UTC"} · ${t.timezoneDiffers(deviceTimeZone())}`
              }
              icon="earth"
              testID="setting-timezone"
              onPress={() => setDialog("timezone")}
            />
            <SettingsItem
              title={t.desktopNotificationsTitle}
              description={`${settings.desktopNotifications ? t.on : t.off} · ${t.desktopNotificationsNote}`}
              icon="monitor"
              disabled
              testID="setting-desktop-notifications"
            />
            <Divider />
          </>
        )}

        <SectionTitle>{t.generalSectionDisplay}</SectionTitle>
        <SettingsItem
          title={t.themeTitle}
          description={t.themes[ui.theme]}
          icon="theme-light-dark"
          testID="setting-theme"
          onPress={() => setDialog("theme")}
        />
        {!synced && (
          <SettingsItem
            title={t.densityTitle}
            description={t.densities[ui.density]}
            icon="format-line-spacing"
            testID="setting-density"
            onPress={() => setDialog("density")}
          />
        )}
        <Divider />

        <SectionTitle>{t.swipeTitle}</SectionTitle>
        <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          {t.swipeHint}
        </Text>
        <SettingsItem
          title={t.swipeRight}
          description={t.swipeActions[ui.swipeRightAction]}
          left={<SwipePreview action={ui.swipeRightAction} />}
          testID="setting-swipe-right"
          onPress={() => setDialog("swipeRight")}
        />
        <SettingsItem
          title={t.swipeLeft}
          description={t.swipeActions[ui.swipeLeftAction]}
          left={<SwipePreview action={ui.swipeLeftAction} />}
          testID="setting-swipe-left"
          onPress={() => setDialog("swipeLeft")}
        />
        <Divider />

        <SectionTitle>{t.generalSectionActions}</SectionTitle>
        <SwitchItem
          title={t.confirmBeforeTrash}
          description={ui.confirmTrash ? t.on : t.off}
          icon="delete-alert-outline"
          value={ui.confirmTrash}
          onValueChange={setConfirmTrash}
          testID="setting-confirm-trash"
        />
        <SwitchItem
          title={t.confirmBeforeArchive}
          description={ui.confirmArchive ? t.on : t.off}
          icon="archive-alert-outline"
          value={ui.confirmArchive}
          onValueChange={setConfirmArchive}
          testID="setting-confirm-archive"
        />
        <Divider />

        <SectionTitle>{t.generalSectionMessages}</SectionTitle>
        <SwitchItem
          title={t.markReadOnOpenTitle}
          description={ui.markReadOnOpen ? t.markReadOnOpenOn : t.markReadOnOpenOff}
          icon="email-open-outline"
          value={ui.markReadOnOpen}
          onValueChange={setMarkReadOnOpen}
          testID="setting-mark-read"
        />
        <SettingsItem
          title={t.remoteImagesTitle}
          description={t.remoteImages[ui.showRemoteImages]}
          icon="image-outline"
          testID="setting-images"
          onPress={() => setDialog("images")}
        />
        <Divider />

        <SectionTitle>{t.pushTitle}</SectionTitle>
        <SettingsItem
          title={t.pushTitle}
          description={t.pushUnavailable}
          icon="bell-off-outline"
          disabled
          testID="setting-push"
        />
        <Text variant="bodySmall" style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          {synced ? t.deviceSettingsNote : t.localSettingsNote}
        </Text>
      </ScrollView>
      <SettingsSnackbar />

      <ChoiceDialog
        visible={dialog === "theme"}
        title={t.themeTitle}
        value={ui.theme}
        choices={themes.map((value) => ({ value, label: t.themes[value] }))}
        onSelect={pick(setTheme)}
        onDismiss={close}
      />
      <ChoiceDialog
        visible={dialog === "density"}
        title={t.densityTitle}
        value={synced && settings ? settings.density : ui.density}
        choices={(synced ? serverDensities : localDensities).map((value) => ({
          value,
          label: t.densities[value],
        }))}
        onSelect={pick((density: Density) =>
          synced ? patch.mutate({ density }) : setDensity(density),
        )}
        onDismiss={close}
      />
      {settings && (
        <ChoiceDialog
          visible={dialog === "undoSend"}
          title={t.undoSendTitle}
          value={String(settings.undoSendSeconds)}
          choices={undoSendChoices.map((value) => ({
            value,
            label: t.undoSendSeconds(Number(value)),
          }))}
          onSelect={pick((v: string) => patch.mutate({ undoSendSeconds: Number(v) }))}
          onDismiss={close}
        />
      )}
      {settings && dialog === "signature" && (
        <TextDialog
          testID="signature-dialog"
          title={t.signatureTitle}
          description={t.signatureHint}
          label={t.signatureTitle}
          initial={signatureToText(settings.signature)}
          multiline
          allowEmpty
          onSubmit={pick((text: string) => patch.mutate({ signature: textToSignatureHtml(text) }))}
          onDismiss={close}
        />
      )}
      {settings && dialog === "timezone" && (
        <TimezoneDialog
          value={settings.timezone}
          onSelect={pick((timezone: string) => patch.mutate({ timezone }))}
          onDismiss={close}
        />
      )}
      <ChoiceDialog
        visible={dialog === "swipeRight"}
        title={t.swipeRight}
        value={ui.swipeRightAction}
        choices={swipeChoices}
        onSelect={pick((v: SwipeAction) => setSwipeActions(ui.swipeLeftAction, v))}
        onDismiss={close}
      />
      <ChoiceDialog
        visible={dialog === "swipeLeft"}
        title={t.swipeLeft}
        value={ui.swipeLeftAction}
        choices={swipeChoices}
        onSelect={pick((v: SwipeAction) => setSwipeActions(v, ui.swipeRightAction))}
        onDismiss={close}
      />
      <ChoiceDialog
        visible={dialog === "images"}
        title={t.remoteImagesTitle}
        value={ui.showRemoteImages}
        choices={imageModes.map((value) => ({ value, label: t.remoteImages[value] }))}
        onSelect={pick(setShowRemoteImages)}
        onDismiss={close}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  hint: { paddingHorizontal: 16, paddingBottom: 4 },
  note: { paddingHorizontal: 16, paddingTop: 16 },
  preview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
