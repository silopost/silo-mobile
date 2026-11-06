import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Modal, StyleSheet, View } from "react-native";
import { Appbar, Icon } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiBaseUrl, clientId } from "../../api/client";
import { useServerFeature } from "../../lib/features";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";
import { useAuth } from "../../state/auth";

/** The image source of an API path with the bearer header (ADR 0007: never a token in the URL). */
export type AuthImageSource = { uri: string; headers: Record<string, string> };

/**
 * An `Image` source for a path under /api/v1 with Authorization and X-Silo-Client, or null until
 * the client id is known (or signed out). React Native's `Image` sends `headers` on Android and
 * iOS; its image cache may keep the answer after sign-out (see docs/NOTES-FOR-SILO.md).
 */
export function useAuthImageSource(path: string): AuthImageSource | null {
  const { serverUrl, token } = useAuth();
  const client = useQuery({ queryKey: ["clientId"], queryFn: clientId, staleTime: Infinity }).data;
  if (!serverUrl || !token || !client) return null;
  return {
    uri: `${apiBaseUrl(serverUrl)}${path}`,
    headers: { Authorization: `Bearer ${token}`, "X-Silo-Client": client },
  };
}

const thumbnailPath = (id: string, size: "s" | "m") =>
  `/attachments/${encodeURIComponent(id)}/thumbnail?size=${size}`;

/** Whether to ask GET /attachments/{id}/thumbnail for an attachment or upload (server 0.4.0). */
export function useHasThumbnail(item: { thumbnail?: boolean }): boolean {
  const feature = useServerFeature("thumbnails");
  return feature && item.thumbnail === true;
}

type Props = {
  id: string;
  /** Edge of the square drawn, in dp. */
  dimension: number;
  /** The icon of the file type, drawn when there is no thumbnail (415, network). */
  fallbackIcon: string;
  fallbackColor: string;
};

/**
 * The server's small thumbnail (size s, at most 64 px) of a picture attachment or upload, or the
 * icon of its type when the server answers an error (415 thumbnail_unsupported).
 */
export function Thumbnail({ id, dimension, fallbackIcon, fallbackColor }: Props) {
  const source = useAuthImageSource(thumbnailPath(id, "s"));
  const [failed, setFailed] = useState(false);
  if (failed || !source) return <Icon source={fallbackIcon} size={24} color={fallbackColor} />;
  return (
    <Image
      testID={`thumbnail-${id}`}
      source={source}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
      style={[styles.thumb, { width: dimension, height: dimension }]}
    />
  );
}

type PreviewProps = {
  id: string;
  title: string;
  onShare: () => void;
  onDismiss: () => void;
};

/**
 * Full-screen preview of a picture attachment: the server's medium thumbnail (size m, at most
 * 256 px) while the picture itself (GET /attachments/{id}?inline=1) loads over it, both with the
 * bearer header. "Udostępnij" downloads the file into the share sheet (the existing download).
 */
export function ImagePreview({ id, title, onShare, onDismiss }: PreviewProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const medium = useAuthImageSource(thumbnailPath(id, "m"));
  const full = useAuthImageSource(`/attachments/${encodeURIComponent(id)}?inline=1`);
  const [fullFailed, setFullFailed] = useState(false);
  return (
    <Modal visible animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={[styles.preview, { paddingTop: insets.top }]} testID={`image-preview-${id}`}>
        <Appbar.Header style={styles.bar} statusBarHeight={0}>
          <Appbar.Action
            icon="close"
            color="#ffffff"
            accessibilityLabel={t.close}
            onPress={onDismiss}
          />
          <Appbar.Content title={title} titleStyle={styles.title} />
          <Appbar.Action
            icon="share-variant-outline"
            color="#ffffff"
            accessibilityLabel={t.shareAttachment}
            onPress={onShare}
          />
        </Appbar.Header>
        <View style={styles.stage}>
          {medium && <Image source={medium} resizeMode="contain" style={StyleSheet.absoluteFill} />}
          {full && !fullFailed && (
            <Image
              testID={`image-full-${id}`}
              source={full}
              resizeMode="contain"
              onError={() => setFullFailed(true)}
              accessibilityLabel={title}
              style={StyleSheet.absoluteFill}
            />
          )}
          {!medium && !full && (
            <Icon source="image-off-outline" size={48} color={theme.colors.outline} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: 4 },
  preview: { flex: 1, backgroundColor: "#000000" },
  bar: { backgroundColor: "transparent", elevation: 0 },
  title: { color: "#ffffff" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
});
