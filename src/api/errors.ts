import type { components } from "./schema";

export type Problem = components["schemas"]["Problem"];

/** An RFC 9457 problem answered by the server (plan 5.3); `code` is the stable field to branch on. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  /** Seconds from the Retry-After header (429, 503). */
  readonly retryAfter: number | undefined;
  /** The whole problem: limit/size (413), currentVersion/current (409), address/field (400). */
  readonly problem: Problem | undefined;

  constructor(status: number, problem: Problem | undefined, retryAfter: number | undefined) {
    super(problem?.detail || problem?.title || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = problem?.code;
    this.retryAfter = retryAfter;
    this.problem = problem;
  }
}

export function isApiError(err: unknown, status?: number): err is ApiError {
  return err instanceof ApiError && (status === undefined || err.status === status);
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Unwraps an openapi-fetch result: the data, or an ApiError for a non-2xx answer. */
export async function call<T>(request: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok) {
    const header = response.headers.get("Retry-After");
    const retryAfter = header && /^\d+$/.test(header) ? Number(header) : undefined;
    const problem = typeof error === "object" && error !== null ? (error as Problem) : undefined;
    throw new ApiError(response.status, problem, retryAfter);
  }
  return data as T;
}
