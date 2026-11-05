import { http, HttpResponse } from "msw";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { createApiClient } from "./client";
import { ApiError, call, isApiError } from "./errors";

setupMsw();

const problem = (status: number, body: Record<string, unknown>, headers?: HeadersInit) =>
  HttpResponse.json(
    { status, title: "Error", ...body },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );

describe("call", () => {
  const client = () => createApiClient(SERVER_URL);

  it("returns the data of a 2xx answer", async () => {
    server.use(http.get(`${API}/meta`, () => HttpResponse.json({ serverVersion: "0.3.0" })));
    const meta = await call(client().GET("/meta"));
    expect(meta.serverVersion).toBe("0.3.0");
  });

  it("maps a problem to ApiError with its code and extension fields", async () => {
    server.use(
      http.get(`${API}/meta`, () =>
        problem(413, {
          code: "upload_too_large",
          detail: "Too large",
          limit: 1000,
          size: 2000,
        }),
      ),
    );
    const err = await call(client().GET("/meta")).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const apiError = err as ApiError;
    expect(apiError.status).toBe(413);
    expect(apiError.code).toBe("upload_too_large");
    expect(apiError.message).toBe("Too large");
    expect(apiError.problem?.limit).toBe(1000);
    expect(apiError.problem?.size).toBe(2000);
    expect(apiError.retryAfter).toBeUndefined();
  });

  it("reads Retry-After in seconds", async () => {
    server.use(
      http.post(`${API}/session`, () =>
        problem(429, { code: "rate_limited" }, { "Retry-After": "30" }),
      ),
    );
    const err = await call(
      client().POST("/session", { body: { email: "a@b.c", password: "x" } }),
    ).catch((e: unknown) => e);
    expect(isApiError(err, 429)).toBe(true);
    expect((err as ApiError).retryAfter).toBe(30);
  });

  it("gives an ApiError without a problem for a non-JSON error", async () => {
    server.use(http.get(`${API}/meta`, () => new HttpResponse("Bad gateway", { status: 502 })));
    const err = await call(client().GET("/meta")).catch((e: unknown) => e);
    expect(isApiError(err, 502)).toBe(true);
    expect((err as ApiError).code).toBeUndefined();
  });

  it("lets a network failure through as a non-ApiError", async () => {
    server.use(http.get(`${API}/meta`, () => HttpResponse.error()));
    const err = await call(client().GET("/meta")).catch((e: unknown) => e);
    // Node fetch rejects with a TypeError from its own realm, so check the name, not instanceof.
    expect((err as Error).name).toBe("TypeError");
    expect(isApiError(err)).toBe(false);
  });
});
