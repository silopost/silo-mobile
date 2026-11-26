import type { Client } from "openapi-fetch";
import { api } from "../../api/client";
import { call } from "../../api/errors";
import type { components } from "../../api/schema";
import type { Meta } from "../../api/types";

/*
 * Push devices are not in a released server contract yet: src/api/schema.d.ts is generated from
 * silo-server v0.4.0 (`silo.serverRef`), and POST /devices, GET /devices/current,
 * DELETE /devices/{id} and `Meta.push` come with the next release. Until `serverRef` is bumped
 * (and `npm run gen:api` adds them to the schema), the types below mirror that part of
 * silo-server's api/openapi.yaml; then they are replaced by aliases in src/api/types.ts and this
 * module calls api() directly.
 */

type Problem = components["schemas"]["Problem"];

/** `Meta.push`: providers POST /devices accepts; empty when the instance has push switched off. */
export type PushMeta = { providers: string[] | null };

/** GET /meta of a server that may know push (older servers have no `push` field). */
export type MetaWithPush = Meta & { push?: PushMeta };

/** The push device of the current bearer session. */
export type Device = {
  /** dev_… */
  id: string;
  provider: "expo";
  pushToken: string;
  /** Accounts (acc_…) whose new mail is pushed; null: every account of the user. */
  accountIds: string[] | null;
  createdAt: string;
  lastUsedAt: string;
  /** Last delivery error reported by the push service; null after a successful push. */
  lastError: string | null;
};

export type RegisterDevice = {
  provider: "expo";
  /** ExponentPushToken[…] / ExpoPushToken[…] */
  pushToken: string;
  /** Omitted or null: every account (also accounts added later). */
  accountIds?: string[] | null;
};

type ProblemResponse = {
  headers: { [name: string]: unknown };
  content: { "application/problem+json": Problem };
};
type JsonResponse<T> = {
  headers: { [name: string]: unknown };
  content: { "application/json": T };
};
type NoParams = { query?: never; header?: never; path?: never; cookie?: never };

/** The /devices paths in the shape openapi-typescript generates. */
type PushPaths = {
  "/devices": {
    parameters: NoParams;
    post: {
      parameters: NoParams;
      requestBody: { content: { "application/json": RegisterDevice } };
      responses: {
        200: JsonResponse<Device>;
        400: ProblemResponse;
        401: ProblemResponse;
        403: ProblemResponse;
        422: ProblemResponse;
      };
    };
  };
  "/devices/current": {
    parameters: NoParams;
    get: {
      parameters: NoParams;
      requestBody?: never;
      responses: {
        200: JsonResponse<Device>;
        401: ProblemResponse;
        403: ProblemResponse;
        404: ProblemResponse;
      };
    };
  };
  "/devices/{id}": {
    parameters: NoParams;
    delete: {
      parameters: { query?: never; header?: never; path: { id: string }; cookie?: never };
      requestBody?: never;
      responses: {
        204: { headers: { [name: string]: unknown }; content?: never };
        401: ProblemResponse;
        404: ProblemResponse;
      };
    };
  };
};

/** The client of the signed-in instance (same headers and 401 handling) typed for /devices. */
const devicesApi = () => api() as unknown as Client<PushPaths>;

/** POST /devices: registers (or updates) the device of this session. */
export function registerDevice(body: RegisterDevice): Promise<Device> {
  return call(devicesApi().POST("/devices", { body }));
}

/** GET /devices/current; 404 (ApiError) when the session has no device. */
export function getCurrentDevice(signal?: AbortSignal): Promise<Device> {
  return call(devicesApi().GET("/devices/current", { signal }));
}

/** DELETE /devices/{id}. */
export async function deleteDevice(id: string): Promise<void> {
  await call(devicesApi().DELETE("/devices/{id}", { params: { path: { id } } }));
}
