// Runs before each test file, after jest-expo's setup. That setup installs Expo's "winter" fetch,
// whose Response is backed by a native module and cannot carry a body built in JavaScript, so
// msw's mocked responses would arrive empty. Tests talk HTTP through msw, so put back Node's own
// WHATWG fetch, saved by jest.environment.js. App code resolves globalThis.fetch per call.
for (const [name, value] of Object.entries(globalThis.__nodeFetch)) {
  // Expo defines these globals as lazy getters; replace them with plain values.
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}
delete globalThis.__nodeFetch;
