import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, IconButton, ProgressBar, Text } from "react-native-paper";
import type { PickedFile } from "../../api/drafts";
import type { UploadInfo } from "../../api/types";
import { BottomSheet } from "../../components/BottomSheet";
import { formatSize } from "../../lib/format";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { attachmentIcon } from "../thread/AttachmentChips";
import type { UploadItem } from "./session";

type TileProps = {
  name: string;
  size: number;
  contentType: string;
  removeLabel: string;
  onRemove: () => void;
  /** 0..1 while uploading. */
  progress?: number;
  error?: string;
};

function Tile({ name, size, contentType, removeLabel, onRemove, progress, error }: TileProps) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel={`${name}, ${formatSize(size)}`}
      style={[
        styles.tile,
        error
          ? { borderColor: theme.colors.error, backgroundColor: theme.colors.errorContainer }
          : { borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={styles.tileRow}>
        <Icon source={attachmentIcon(contentType, name)} size={24} color={theme.colors.primary} />
        <View style={styles.tileText}>
          <Text numberOfLines={1} variant="bodyMedium">
            {name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatSize(size)}
          </Text>
        </View>
        <IconButton icon="close" size={20} accessibilityLabel={removeLabel} onPress={onRemove} />
      </View>
      {progress !== undefined && !error && (
        <ProgressBar
          progress={progress}
          accessibilityLabel={t.uploading(name)}
          style={styles.progress}
        />
      )}
      {error ? (
        <Text
          accessibilityRole="alert"
          variant="bodySmall"
          style={[styles.error, { color: theme.colors.onErrorContainer }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type Props = {
  attachments: UploadInfo[];
  uploads: UploadItem[];
  onRemove: (id: string) => void;
  onRemoveUpload: (key: number) => void;
};

/**
 * Attachments of the draft and uploads in progress with their progress bars (plan 5.6). The "x"
 * of an upload cancels its request; of an attachment, drops it from attachmentIds.
 */
export function AttachmentList({ attachments, uploads, onRemove, onRemoveUpload }: Props) {
  if (attachments.length === 0 && uploads.length === 0) return null;
  return (
    <View accessibilityLabel={t.attachments} style={styles.list}>
      {attachments.map((a) => (
        <Tile
          key={a.id}
          name={a.filename}
          size={a.size}
          contentType={a.contentType}
          removeLabel={t.removeAttachment(a.filename)}
          onRemove={() => onRemove(a.id)}
        />
      ))}
      {uploads.map((u) => (
        <Tile
          key={u.key}
          name={u.name}
          size={u.size}
          contentType=""
          removeLabel={u.error ? t.removeAttachment(u.name) : t.cancelUpload(u.name)}
          onRemove={() => onRemoveUpload(u.key)}
          progress={u.progress}
          error={u.error}
        />
      ))}
    </View>
  );
}

/** Files from the system document picker (several at once). */
export async function pickDocuments(): Promise<PickedFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return [];
  return res.assets.map((a) => ({
    uri: a.uri,
    name: a.name,
    type: a.mimeType ?? "application/octet-stream",
    size: a.size ?? 0,
  }));
}

/** Photos from the gallery (the system photo picker needs no permission on Android 13+). */
export async function pickImages(): Promise<PickedFile[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (res.canceled) return [];
  return res.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? a.uri.split("/").pop() ?? `zdjecie-${i + 1}.jpg`,
    type: a.mimeType ?? "image/jpeg",
    size: a.fileSize ?? 0,
  }));
}

/** The sheet of the paperclip icon: "Załącz plik" / "Wstaw z galerii", as in the Gmail app. */
export function AttachSheet({
  visible,
  onDismiss,
  onFiles,
}: {
  visible: boolean;
  onDismiss: () => void;
  onFiles: (files: PickedFile[]) => void;
}) {
  const theme = useAppTheme();
  const pick = (picker: () => Promise<PickedFile[]>) => {
    onDismiss();
    void picker()
      .then((files) => files.length > 0 && onFiles(files))
      .catch(() => undefined);
  };
  const rows: [string, string, () => Promise<PickedFile[]>][] = [
    ["paperclip", t.attachFile, pickDocuments],
    ["image-outline", t.insertFromGallery, pickImages],
  ];
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title={t.attach}>
      {rows.map(([icon, label, picker]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => pick(picker)}
          android_ripple={{ color: theme.colors.surfaceVariant }}
          style={styles.sheetRow}
        >
          <Icon source={icon} size={24} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge">{label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tile: { borderWidth: 1, borderRadius: 8, paddingLeft: 12 },
  tileRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: MIN_TOUCH + 8 },
  tileText: { flex: 1 },
  progress: { marginRight: 12, marginBottom: 8 },
  error: { paddingRight: 12, paddingBottom: 8 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    minHeight: 56,
    paddingHorizontal: 24,
  },
});
