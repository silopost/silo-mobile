// Runs before each test file, after jest-expo's setup. jest-expo installs Expo's "winter" fetch
// (expo/src/winter), whose Response is backed by a native module and cannot carry a body built in
// JavaScript, so msw's mocked responses would arrive empty. Tests talk HTTP through msw, so put
// back the WHATWG fetch classes of Node (undici); app code resolves globalThis.fetch per call.
const { fetch, Headers, Request, Response, FormData } = require("undici");

Object.assign(globalThis, { fetch, Headers, Request, Response, FormData });
