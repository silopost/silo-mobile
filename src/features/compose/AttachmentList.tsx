import type { ReactNode } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet, View } from "react-native";
import { Icon, IconButton, ProgressBar, Text } from "react-native-paper";
import type { PickedFile } from "../../api/drafts";
import type { UploadInfo } from "../../api/types";
import { DropdownMenu, MenuEntry } from "../../components/DropdownMenu";
import { formatSize } from "../../lib/format";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { attachmentIcon } from "../thread/AttachmentChips";
import { Thumbnail, useHasThumbnail } from "../thread/Thumbnail";
import type { UploadItem } from "./session";

type TileProps = {
  /** The upload id when it has a server thumbnail (UploadInfo.thumbnail, server 0.4.0). */
  thumbnailId?: string;
  name: string;
  size: number;
  contentType: string;
  removeLabel: string;
  onRemove: () => void;
  /** 0..1 while uploading. */
  progress?: number;
  error?: string;
};

function Tile({
  thumbnailId,
  name,
  size,
  contentType,
  removeLabel,
  onRemove,
  progress,
  error,
}: TileProps) {
  const theme = useAppTheme();
  const icon = attachmentIcon(contentType, name);
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
        {thumbnailId ? (
          <Thumbnail
            id={thumbnailId}
            dimension={32}
            fallbackIcon={icon}
            fallbackColor={theme.colors.primary}
          />
        ) : (
          <Icon source={icon} size={24} color={theme.colors.primary} />
        )}
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
  if (attachments.every((a) => a.inline && a.cid) && uploads.length === 0) return null;
  return (
    <View accessibilityLabel={t.attachments} style={styles.list}>
      {attachments
        // Inline pictures are shown in the body; deleting one there unpins its upload.
        .filter((a) => !(a.inline && a.cid))
        .map((a) => (
          <AttachmentTile key={a.id} attachment={a} onRemove={onRemove} />
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

/** An attachment of the draft, with its server thumbnail when it is a picture (0.4.0). */
function AttachmentTile({
  attachment: a,
  onRemove,
}: {
  attachment: UploadInfo;
  onRemove: (id: string) => void;
}) {
  const thumb = useHasThumbnail(a);
  return (
    <Tile
      thumbnailId={thumb ? a.id : undefined}
      name={a.filename}
      size={a.size}
      contentType={a.contentType}
      removeLabel={t.removeAttachment(a.filename)}
      onRemove={() => onRemove(a.id)}
    />
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

/**
 * The menu of the paperclip icon, as in the Gmail app (2026): "Zdjęcia", "Pliki" and, with
 * server 0.4.0, "Wstaw obraz w treści" (an inline picture, as pasted into silo-web's editor).
 * Mounted only while open, over `anchor`.
 */
export function AttachMenu({
  anchor,
  onDismiss,
  onFiles,
  onInlineImages,
}: {
  anchor: ReactNode;
  onDismiss: () => void;
  onFiles: (files: PickedFile[]) => void;
  onInlineImages?: (files: PickedFile[]) => void;
}) {
  const pick =
    (picker: () => Promise<PickedFile[]>, done = onFiles) =>
    () => {
      onDismiss();
      void picker()
        .then((files) => files.length > 0 && done(files))
        .catch(() => undefined);
    };
  return (
    <DropdownMenu anchor={anchor} onDismiss={onDismiss}>
      <MenuEntry icon="image-outline" title={t.insertFromGallery} onPress={pick(pickImages)} />
      <MenuEntry icon="file-outline" title={t.attachFile} onPress={pick(pickDocuments)} />
      {onInlineImages && (
        <MenuEntry
          icon="image-text"
          title={t.insertInlineImage}
          onPress={pick(pickImages, onInlineImages)}
        />
      )}
    </DropdownMenu>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tile: { borderWidth: 1, borderRadius: 8, paddingLeft: 12 },
  tileRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: MIN_TOUCH + 8 },
  tileText: { flex: 1 },
  progress: { marginRight: 12, marginBottom: 8 },
  error: { paddingRight: 12, paddingBottom: 8 },
});
