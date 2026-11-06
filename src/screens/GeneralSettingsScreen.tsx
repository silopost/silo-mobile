import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Divider, Icon, Text } from "react-native-paper";
import { ChoiceDialog, SectionTitle, SettingsItem, SwitchItem } from "../features/settings/items";
import { swipeLook } from "../features/threadlist/SwipeableRow";
import { t } from "../lib/i18n";
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

type DialogKind = "theme" | "density" | "swipeRight" | "swipeLeft" | "images";

const themes: ThemePreference[] = ["system", "light", "dark"];
const densities: Density[] = ["default", "compact"];
const swipeActions: SwipeAction[] = ["archive", "trash", "none"];
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
 * "Ustawienia ogólne" of the Gmail app, kept on this device (useUi): API 0.3.0 has no /settings,
 * so nothing here is shared with other clients. Every entry shows its current value under the
 * title; choices open a radio dialog, booleans are switches.
 */
export function GeneralSettingsScreen() {
  const theme = useAppTheme();
  const ui = useUi();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);
  const pick =
    <T,>(apply: (v: T) => void) =>
    (v: T) => {
      apply(v);
      close();
    };

  const swipeChoices = swipeActions.map((value) => ({
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
        <SectionTitle>{t.generalSectionDisplay}</SectionTitle>
        <SettingsItem
          title={t.themeTitle}
          description={t.themes[ui.theme]}
          icon="theme-light-dark"
          testID="setting-theme"
          onPress={() => setDialog("theme")}
        />
        <SettingsItem
          title={t.densityTitle}
          description={t.densities[ui.density]}
          icon="format-line-spacing"
          testID="setting-density"
          onPress={() => setDialog("density")}
        />
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
          {t.localSettingsNote}
        </Text>
      </ScrollView>

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
        value={ui.density}
        choices={densities.map((value) => ({ value, label: t.densities[value] }))}
        onSelect={pick(setDensity)}
        onDismiss={close}
      />
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
