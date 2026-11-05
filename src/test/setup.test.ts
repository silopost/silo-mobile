import { http, HttpResponse } from "msw";
import { API, server, setupMsw } from "./server";

setupMsw();

// Guards the test environment itself (jest.polyfills.js): msw answers fetch with a readable body.
test("msw answers fetch with a JSON body", async () => {
  server.use(http.get(`${API}/meta`, () => HttpResponse.json({ serverVersion: "0.3.0" })));
  const res = await globalThis.fetch(`${API}/meta`);
  expect(await res.json()).toEqual({ serverVersion: "0.3.0" });
});
