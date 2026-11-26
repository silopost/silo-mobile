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

// Notifications: channels, permission, Expo push token and the listeners as jest.fns. Tests
// steer them through src/test/push.ts (permission answer, token, emitting a token change or a
// tap); every call is recorded in `__calls` in order (channel before permission before token).
/** A listener of the fake expo-notifications (outside the factory: jest.mock hoisting). */
type MockListener = (value: unknown) => void;
jest.mock("expo-notifications", () => {
  const calls: string[] = [];
  const tokenListeners = new Set<MockListener>();
  const responseListeners = new Set<MockListener>();
  const state = {
    permission: "granted" as "granted" | "denied" | "undetermined",
    answer: "granted" as "granted" | "denied",
    token: "ExponentPushToken[test-1]",
    /** The FCM token every token fetch emits to addPushTokenListener, as the native module does. */
    deviceToken: "fcm-1",
    lastResponse: null as unknown,
  };
  const permission = (status: string) => ({
    status,
    granted: status === "granted",
    canAskAgain: status !== "denied",
    expires: "never",
  });
  const subscribe = (set: Set<MockListener>) => (listener: MockListener) => {
    set.add(listener);
    return { remove: () => set.delete(listener) };
  };
  const fns = {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async (id: string) => {
      calls.push(`channel:${id}`);
      return null;
    }),
    getPermissionsAsync: jest.fn(async () => {
      calls.push("getPermissions");
      return permission(state.permission);
    }),
    requestPermissionsAsync: jest.fn(async () => {
      calls.push("requestPermissions");
      state.permission = state.answer;
      return permission(state.answer);
    }),
    getExpoPushTokenAsync: jest.fn(async (options: { projectId?: string }) => {
      calls.push(`token:${options.projectId}`);
      // PushTokenModule.kt resolves the device token and then emits it (onNewToken).
      const device = { type: "android", data: state.deviceToken };
      setTimeout(() => tokenListeners.forEach((l) => l(device)), 0);
      return { type: "expo", data: state.token };
    }),
    addPushTokenListener: jest.fn(subscribe(tokenListeners)),
    addNotificationResponseReceivedListener: jest.fn(subscribe(responseListeners)),
    getLastNotificationResponse: jest.fn(() => state.lastResponse),
    clearLastNotificationResponse: jest.fn(() => {
      state.lastResponse = null;
    }),
  };
  return {
    ...fns,
    __calls: calls,
    __state: state,
    __emitToken: (token: unknown) => tokenListeners.forEach((l) => l(token)),
    __emitResponse: (response: unknown) => responseListeners.forEach((l) => l(response)),
    __reset: () => {
      calls.length = 0;
      Object.values(fns).forEach((fn) => fn.mockClear());
      tokenListeners.clear();
      responseListeners.clear();
      Object.assign(state, {
        permission: "granted",
        answer: "granted",
        token: "ExponentPushToken[test-1]",
        deviceToken: "fcm-1",
        lastResponse: null,
      });
    },
    AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 },
    DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  };
});

afterEach(() => {
  (jest.requireMock("expo-notifications") as { __reset: () => void }).__reset();
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
    setImage: (src: string) => void;
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
        // An inserted picture lands at the end of the content (the caret is not modelled).
        setImage: jest.fn((src: string) => {
          b.html += `<img src="${src}">`;
          b.options.onChange?.();
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
    PlaceholderBridge: { configureExtension: () => ({ configureCSS: () => ({}) }) },
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

// The UI language of the tests is Polish (the assertions use the Polish texts); a test of English
// switches it itself. Every test starts in Polish again.
beforeEach(() => {
  (jest.requireActual("./src/lib/i18n") as typeof import("./src/lib/i18n")).setLocale("pl");
});
