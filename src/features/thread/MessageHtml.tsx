import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { inlineImagesQuery, messageHtmlQuery } from "../../api/queries/messageHtml";
import type { Message } from "../../api/types";
import { t } from "../../lib/i18n";
import { hasRemoteImages, MEASURE_SCRIPT, prepareHtml } from "../../lib/messageHtml";
import { useAppTheme } from "../../lib/theme";
import { useUi } from "../../state/ui";

/** Messages whose remote images the user chose to show (until the app restarts). */
const imagesShown = new Set<string>();

/** Height of the WebView until the document reports its own, in dp. */
const MIN_HEIGHT = 40;

/**
 * Where a tap on a link goes: the document itself may load (about:blank of `source.html`), web
 * links open in a Custom Tab, mailto: and tel: in their apps; nothing else, and nothing loads in
 * the WebView, so the message can never navigate the card.
 */
export function onLinkRequest(url: string): boolean {
  if (url === "about:blank" || url.startsWith("data:")) return true;
  if (/^https?:/i.test(url)) void WebBrowser.openBrowserAsync(url).catch(() => undefined);
  else if (/^(mailto|tel):/i.test(url)) void Linking.openURL(url).catch(() => undefined);
  return false;
}

/**
 * The body of an expanded message: the sanitised HTML of GET /messages/{id}/html in a WebView
 * sized to its content. A text-only message comes from the server as a preformatted block, so
 * bodyText is never shown twice.
 */
export function MessageHtml({ message }: { message: Message }) {
  const theme = useAppTheme();
  const html = useQuery(messageHtmlQuery(message.id));
  const inline = useQuery(inlineImagesQuery(message.id, html.data, message.attachments ?? []));
  const always = useUi((s) => s.showRemoteImages === "always");
  const [shownHere, setShowImages] = useState(() => imagesShown.has(message.id));
  // "Pokazuj obrazy zewnętrzne: zawsze" (settings) needs no tap per message.
  const showImages = always || shownHere;
  const [height, setHeight] = useState(MIN_HEIGHT);

  const remote = useMemo(() => (html.data ? hasRemoteImages(html.data) : false), [html.data]);
  // The inline images are swapped in once fetched; until then the document waits for them.
  const waitingInline = inline.isLoading;
  const doc = useMemo(
    () =>
      html.data === undefined || waitingInline
        ? undefined
        : prepareHtml(html.data, { showImages, inline: inline.data }),
    [html.data, showImages, inline.data, waitingInline],
  );

  // While a 503 is retried after Retry-After the query stays pending: one spinner for both.
  if (html.isPending || (html.isSuccess && waitingInline)) {
    return (
      <View
        style={styles.status}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t.contentLoading}
      >
        <ActivityIndicator size={16} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t.contentLoading}
        </Text>
      </View>
    );
  }
  if (html.isError || doc === undefined) {
    return (
      <View style={styles.status} accessibilityLiveRegion="polite">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t.contentError}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          ·
        </Text>
        <Button compact onPress={() => void html.refetch()}>
          {t.tryAgain}
        </Button>
      </View>
    );
  }

  const onMessage = (e: WebViewMessageEvent) => {
    const h = Number(e.nativeEvent.data);
    if (Number.isFinite(h) && h > 0) setHeight(Math.max(MIN_HEIGHT, Math.ceil(h)));
  };

  return (
    <View>
      {remote && !showImages && (
        <View style={styles.images}>
          <Text variant="bodySmall" style={[styles.grow, { color: theme.colors.onSurfaceVariant }]}>
            {t.imagesBlocked}
          </Text>
          <Button
            compact
            onPress={() => {
              imagesShown.add(message.id);
              setShowImages(true);
            }}
          >
            {t.showImages}
          </Button>
        </View>
      )}
      <WebView
        testID={`message-html-${message.id}`}
        accessibilityLabel={t.messageBody}
        source={{ html: doc }}
        style={[styles.web, { height }]}
        // Only the app's height script runs: the server removed the message's scripts and the
        // CSP of the document allows inline script for the injected one alone (NOTES).
        javaScriptEnabled
        injectedJavaScript={MEASURE_SCRIPT}
        onMessage={onMessage}
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={(req) => onLinkRequest(req.url)}
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        domStorageEnabled={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        cacheEnabled={false}
        mixedContentMode="compatibility"
        // Vertical scrolling belongs to the thread; wide mail scrolls sideways in the card.
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        setBuiltInZoomControls={false}
        textZoom={100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  images: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  grow: { flex: 1 },
  web: { width: "100%", backgroundColor: "#ffffff" },
});
