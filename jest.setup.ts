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
