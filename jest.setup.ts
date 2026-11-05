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
