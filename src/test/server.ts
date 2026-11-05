import { setupServer } from "msw/node";

/** Base URL of the Silo instance the tests sign in to; msw answers its /api/v1. */
export const SERVER_URL = "https://silo.test";
export const API = `${SERVER_URL}/api/v1`;

/** One msw server for a test file; handlers are added per test with server.use(). */
export const server = setupServer();

/** Registers the msw lifecycle in the calling test file. */
export function setupMsw() {
  beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
