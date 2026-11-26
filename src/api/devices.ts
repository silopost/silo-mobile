import { api } from "./client";
import { call } from "./errors";
import type { Device, RegisterDevice } from "./types";

/** POST /devices: registers (or updates) the device of this session. */
export function registerDevice(body: RegisterDevice): Promise<Device> {
  return call(api().POST("/devices", { body }));
}

/** GET /devices/current; 404 (ApiError) when the session has no device. */
export function getCurrentDevice(signal?: AbortSignal): Promise<Device> {
  return call(api().GET("/devices/current", { signal }));
}

/** DELETE /devices/{id}. */
export async function deleteDevice(id: string): Promise<void> {
  await call(api().DELETE("/devices/{id}", { params: { path: { id } } }));
}
