import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/** Base URL of the Silo instance the tests sign in to; msw answers its /api/v1. */
export const SERVER_URL = "https://silo.test";
export const API = `${SERVER_URL}/api/v1`;

/** GET /meta of the test instance unless a test answers it itself: a 0.3.0 server. */
export const defaultMeta = {
  serverVersion: "0.3.0",
  apiVersion: "v1",
  authMode: "imap" as const,
  allowCustomServers: true,
  maxAttachmentBytes: 25 * 1024 * 1024,
  minWebVersion: "0.3.0",
};

/**
 * One msw server for a test file; handlers are added per test with server.use(). The initial
 * handlers stay after resetHandlers().
 */
export const server = setupServer(http.get(`${API}/meta`, () => HttpResponse.json(defaultMeta)));

/** Answers GET /meta with a server version (phase 4 features need 0.4.0). */
export function serveMeta(serverVersion: string) {
  server.use(http.get(`${API}/meta`, () => HttpResponse.json({ ...defaultMeta, serverVersion })));
}

/** Registers the msw lifecycle in the calling test file. */
export function setupMsw() {
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
