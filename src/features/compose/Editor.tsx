import {
  BridgeExtension,
  DEFAULT_TOOLBAR_ITEMS,
  PlaceholderBridge,
  RichText,
  TenTapStartKit,
  Toolbar,
  darkEditorTheme,
  useEditorBridge,
  useScrollToCaret,
  type CaretScrollView,
  type EditorBridge,
  type EditorBridgeOptions,
  type ToolbarItem,
} from "@10play/tentap-editor";
import { useEffect, useRef, type RefObject } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "../../lib/i18n";
import { useAppTheme } from "../../lib/theme";

/**
 * The buttons of the toolbar above the keyboard, in this order, with Polish labels: bold,
 * italic, underline, bullet and numbered list, link, quote (the formatting of silo-web's editor).
 */
const TOOLBAR: [string, string][] = [
  ["Bold", t.bold],
  ["Italic", t.italic],
  ["Underline", t.underline],
  ["Bullet list", t.bulletList],
  ["Ordered list", t.orderedList],
  ["Link", t.link],
  ["Quote", t.quote],
];

export const toolbarItems: ToolbarItem[] = TOOLBAR.flatMap(([name, label]) => {
  const item = DEFAULT_TOOLBAR_ITEMS.find((i) => i.label === name);
  return item ? [{ ...item, label }] : [];
});

type Options = {
  /** TipTap JSON (Draft.bodyJson), or HTML (the server's prefill of a reply) when there is none. */
  content: unknown;
  /** Grows when the draft is (re)loaded from the server: the content is replaced. */
  loadSeq: number;
  onChange: (html: string, json: unknown) => void;
  /** The ScrollView the editor grows in (dynamic height): it follows the caret. */
  scrollRef: RefObject<CaretScrollView | null>;
};

type EditorTheme = EditorBridgeOptions["theme"];

type AnyBridge = BridgeExtension<unknown, unknown, unknown>;

/** TenTap's starter kit (StarterKit, Link, Underline, …) and the placeholder. */
const extensions: AnyBridge[] = [
  ...(TenTapStartKit as AnyBridge[]),
  PlaceholderBridge.configureExtension({ placeholder: t.bodyPlaceholder }) as AnyBridge,
];

/** HTML and JSON of the current content (two calls into the WebView). */
async function readContent(e: EditorBridge): Promise<[string, unknown]> {
  const html: string = await e.getHTML();
  const json: unknown = await e.getJSON();
  return [html, json];
}

const initial = (content: unknown) => (content ?? "") as string | object;

/**
 * The message body: TipTap in a WebView (@10play/tentap-editor), the same editor and JSON as
 * silo-web's compose, so a draft keeps its formatting between the phone and the browser. Every
 * change hands over HTML and JSON together (PUT /drafts saves both).
 */
export function useComposeEditor({ content, loadSeq, onChange, scrollRef }: Options) {
  const theme = useAppTheme();
  const callback = useRef(onChange);
  const bridge = useRef<EditorBridge | null>(null);
  useEffect(() => {
    callback.current = onChange;
  });

  const editor = useEditorBridge({
    initialContent: initial(content),
    // The editor grows with its text inside the screen's ScrollView, below the header fields.
    dynamicHeight: true,
    bridgeExtensions: extensions,
    // The library's dark theme; cast because checking it against RecursivePartial<EditorTheme>
    // exceeds the compiler's instantiation depth.
    theme: (theme.dark ? darkEditorTheme : undefined) as unknown as EditorTheme,
    onChange: () => {
      const e = bridge.current;
      if (e) void readContent(e).then(([html, json]) => callback.current(html, json));
    },
  });
  useEffect(() => {
    bridge.current = editor;
  }, [editor]);
  useScrollToCaret(editor, scrollRef);

  // "Wczytaj" or a cancelled send: the server's content replaces the text, as a load.
  const applied = useRef(loadSeq);
  useEffect(() => {
    if (applied.current === loadSeq) return;
    applied.current = loadSeq;
    editor.setContent(initial(content) as Parameters<EditorBridge["setContent"]>[0], {
      emitUpdate: false,
    });
  }, [editor, loadSeq, content]);

  return editor;
}

/** The editable body. */
export function BodyEditor({ editor }: { editor: EditorBridge }) {
  return (
    <View style={styles.body}>
      <RichText editor={editor} accessibilityLabel={t.messageBody} />
    </View>
  );
}

/** Formatting buttons kept on top of the keyboard (at the bottom of the screen without it). */
export function EditorToolbar({ editor }: { editor: EditorBridge }) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel={t.formatting}
      style={[styles.toolbar, { borderTopColor: theme.colors.outlineVariant }]}
    >
      <Toolbar editor={editor} items={toolbarItems} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { minHeight: 200, paddingHorizontal: 8 },
  toolbar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
});
