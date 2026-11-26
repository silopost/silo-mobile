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
 * The buttons of the toolbar above the keyboard, in this order, with labels of the UI language:
 * bold, italic, underline, bullet and numbered list, link, quote (the formatting of silo-web's
 * editor). Keyed by TenTap's own (English) labels; built on render so they follow the language.
 */
export function toolbarItems(): ToolbarItem[] {
  const toolbar: [string, string][] = [
    ["Bold", t.bold],
    ["Italic", t.italic],
    ["Underline", t.underline],
    ["Bullet list", t.bulletList],
    ["Ordered list", t.orderedList],
    ["Link", t.link],
    ["Quote", t.quote],
  ];
  return toolbar.flatMap(([name, label]) => {
    const item = DEFAULT_TOOLBAR_ITEMS.find((i) => i.label === name);
    return item ? [{ ...item, label }] : [];
  });
}

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

/**
 * TenTap's starter kit (StarterKit, Link, Underline, …) and the placeholder, drawn in the colour
 * of the placeholders of Do and Temat (the library's own CSS paints it a fixed grey).
 */
const bridgeExtensions = (placeholderColor: string): AnyBridge[] => [
  ...(TenTapStartKit as AnyBridge[]),
  PlaceholderBridge.configureExtension({ placeholder: t.bodyPlaceholder }).configureCSS(`
    .is-editor-empty:first-child::before {
      color: ${placeholderColor};
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
  `) as AnyBridge,
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
    bridgeExtensions: bridgeExtensions(theme.colors.onSurfaceVariant),
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
      <Toolbar editor={editor} items={toolbarItems()} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The WebView's text starts at its edge: 16 dp lines it up with Od, Do and Temat.
  body: { minHeight: 200, paddingHorizontal: 16 },
  toolbar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
});
