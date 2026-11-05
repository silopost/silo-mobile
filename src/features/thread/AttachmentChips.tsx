import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, ProgressBar, Text } from "react-native-paper";
import { apiBaseUrl, clientId } from "../../api/client";
import type { MessageAttachment } from "../../api/types";
import { formatSize } from "../../lib/format";
import { t } from "../../lib/i18n";
import { MIN_TOUCH, useAppTheme } from "../../lib/theme";
import { useAuth } from "../../state/auth";
import { toast } from "../../state/toasts";

/** Material Design icon of a file type (no thumbnails in API 0.3.0). */
export function attachmentIcon(contentType: string, filename: string): string {
  const type = contentType.toLowerCase();
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (type.startsWith("image/")) return "file-image-outline";
  if (type === "application/pdf" || ext === "pdf") return "file-pdf-box";
  if (type.startsWith("video/")) return "file-video-outline";
  if (type.startsWith("audio/")) return "file-music-outline";
  if (/zip|compressed|x-tar|x-7z|x-rar/.test(type) || ["zip", "7z", "rar", "gz"].includes(ext))
    return "folder-zip-outline";
  if (/spreadsheet|excel|csv/.test(type) || ["xls", "xlsx", "ods", "csv"].includes(ext))
    return "file-excel-outline";
  if (/wordprocessing|msword|opendocument\.text/.test(type) || ["doc", "docx", "odt"].includes(ext))
    return "file-word-outline";
  if (type.startsWith("text/")) return "file-document-outline";
  return "file-outline";
}

/** A file name safe for the cache directory. */
const safeName = (name: string) => name.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, "_") || "plik";

/**
 * Downloads an attachment into the cache with the bearer header (ADR 0007: never a token in the
 * URL) and hands it to the system share sheet, where the user opens or shares it. 503 means the
 * server is still fetching it from the mail server.
 */
export async function openAttachment(
  a: MessageAttachment,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const { serverUrl, token } = useAuth.getState();
  if (!serverUrl || !token || !FileSystem.cacheDirectory) return;
  const target = `${FileSystem.cacheDirectory}${a.id}-${safeName(a.filename)}`;
  const download = FileSystem.createDownloadResumable(
    `${apiBaseUrl(serverUrl)}/attachments/${encodeURIComponent(a.id)}`,
    target,
    { headers: { Authorization: `Bearer ${token}`, "X-Silo-Client": await clientId() } },
    (p) => {
      const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : a.size;
      if (total > 0) onProgress?.(Math.min(1, p.totalBytesWritten / total));
    },
  );
  const result = await download.downloadAsync();
  if (!result || result.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    toast(result?.status === 503 ? t.attachmentNotReady : t.genericError);
    return;
  }
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(result.uri, {
    mimeType: a.contentType || undefined,
    dialogTitle: a.filename,
  });
}

/** One attachment: icon of its type, name and size; a tap downloads and opens it. */
function AttachmentChip({ attachment: a }: { attachment: MessageAttachment }) {
  const theme = useAppTheme();
  const [progress, setProgress] = useState<number | null>(null);
  const size = formatSize(a.size);
  const open = async () => {
    if (progress !== null) return;
    setProgress(0);
    try {
      await openAttachment(a, setProgress);
    } catch {
      toast(t.genericError);
    } finally {
      setProgress(null);
    }
  };
  return (
    <Pressable
      testID={`attachment-${a.id}`}
      accessibilityRole="button"
      accessibilityLabel={t.attachmentLabel(a.filename, size)}
      accessibilityState={{ busy: progress !== null }}
      onPress={() => void open()}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      style={[styles.chip, { borderColor: theme.colors.outlineVariant }]}
    >
      <View style={styles.row}>
        <Icon
          source={attachmentIcon(a.contentType, a.filename)}
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
        <View style={styles.text}>
          <Text numberOfLines={1} variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            {a.filename}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {size}
          </Text>
        </View>
      </View>
      {progress !== null && (
        <ProgressBar testID={`attachment-progress-${a.id}`} progress={progress} />
      )}
    </Pressable>
  );
}

/** Files of a message that are not shown inline in its body. */
export function AttachmentChips({ attachments }: { attachments: MessageAttachment[] }) {
  const files = attachments.filter((a) => !a.inline);
  if (files.length === 0) return null;
  return (
    <View style={styles.list}>
      {files.map((a) => (
        <AttachmentChip key={a.id} attachment={a} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    minHeight: MIN_TOUCH + 8,
    width: 200,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8 },
  text: { flex: 1, minWidth: 0 },
});
