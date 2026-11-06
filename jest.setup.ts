import "react-native-gesture-handler/jestSetup";
// FlashList measures its parent and items natively; the library's setup fixes the sizes (a 400 x
// 900 viewport), so the list renders its first rows in jest.
import "@shopify/flash-list/jestSetup";

// Native modules the app uses, replaced by in-memory fakes for tests.

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    /** Test helper: the stored values. */
    __store: store,
  };
});

jest.mock("expo-device", () => ({
  deviceName: "Pixel Test",
  modelName: "Pixel 8",
}));

afterEach(() => {
  (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store.clear();
});

// AsyncStorage (UI preferences) as the package's in-memory mock.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Gestures and animations of the drawer: jest mocks (react-native-reanimated/mock is mapped to
// src/test/reanimated-mock.js in jest.config.js).
jest.mock("react-native-worklets", () =>
  jest.requireActual("react-native-worklets/lib/module/mock"),
);
jest.mock("react-native-reanimated", () => jest.requireActual("react-native-reanimated/mock"));

// Safe-area insets without a native view to measure them (fixed metrics of the library's mock).
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// Network state for TanStack Query's onlineManager and the event stream: always online.
jest.mock("@react-native-community/netinfo", () =>
  jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock"),
);

// The event stream of the signed-in screens: a source that never opens, so screens render without
// SSE requests to msw (connection stays "connecting", no offline banner). src/api/sse.test.ts
// tests the real one; connectEvents tests inject their own through eventsConfig.
jest.mock("./src/api/sse", () => ({
  ...jest.requireActual("./src/api/sse"),
  fetchEventSource: () => ({ close: () => undefined }),
}));

// The WebView of message bodies: a plain View that keeps its props, so tests read the document
// (`source.html`) and call the handlers (`onMessage`, `onShouldStartLoadWithRequest`).
jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  const { createElement } = jest.requireActual("react");
  const WebView = (props: Record<string, unknown>) => createElement(View, props);
  return { __esModule: true, WebView, default: WebView };
});

// The compose editor (TipTap in a WebView): a fake bridge that keeps the content as HTML. Tests
// type into it with `typeInEditor` (src/test/editor.ts), which fires the bridge's onChange.
jest.mock("@10play/tentap-editor", () => {
  const { View } = jest.requireActual("react-native");
  const { createElement, useState } = jest.requireActual("react");
  type MockOptions = { initialContent?: unknown; onChange?: () => void };
  type MockBridge = {
    html: string;
    options: MockOptions;
    getHTML: () => Promise<string>;
    getJSON: () => Promise<object>;
    setContent: (c: unknown) => void;
    focus: () => void;
    blur: () => void;
    type: (html: string) => void;
  };
  const editors: MockBridge[] = [];
  const toHtml = (c: unknown) => (typeof c === "string" ? c : JSON.stringify(c ?? ""));
  function useEditorBridge(options: MockOptions) {
    const [bridge] = useState((): MockBridge => {
      const b: MockBridge = {
        html: toHtml(options.initialContent),
        options,
        getHTML: jest.fn(async () => b.html),
        getJSON: jest.fn(async () => ({ type: "doc", html: b.html })),
        setContent: jest.fn((c: unknown) => {
          b.html = toHtml(c);
        }),
        focus: jest.fn(),
        blur: jest.fn(),
        /** Test helper: the user typed, the content is now `html`. */
        type: (html: string) => {
          b.html = html;
          b.options.onChange?.();
        },
      };
      return b;
    });
    bridge.options = options;
    // The bridge React kept (an initializer may run twice in strict mode) is the latest one.
    if (editors[editors.length - 1] !== bridge) editors.push(bridge);
    return bridge;
  }
  const Fake = (props: Record<string, unknown>) => createElement(View, props);
  return {
    __editors: editors,
    useEditorBridge,
    useScrollToCaret: () => undefined,
    RichText: ({ editor: _e, ...props }: Record<string, unknown>) => createElement(View, props),
    Toolbar: ({ editor: _e, items: _i, ...props }: Record<string, unknown>) =>
      createElement(View, props),
    EditorKeyboardAvoidingView: Fake,
    TenTapStartKit: [],
    PlaceholderBridge: { configureExtension: () => ({}) },
    DEFAULT_TOOLBAR_ITEMS: [],
    darkEditorTheme: {},
  };
});

// Native date and time dialogs (snooze, scheduled send, search dates): DateTimePickerAndroid.open
// is a jest.fn; a test answers it with `onValueChange` (picked) or `onDismiss`.
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: View,
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});
