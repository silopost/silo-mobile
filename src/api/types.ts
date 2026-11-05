import type { components } from "./schema";

type Schemas = components["schemas"];

/** Aliases of the generated contract types (as in silo-web); no hand-written DTOs (plan 2.6). */
export type Account = Schemas["Account"];
export type Label = Schemas["Label"];
export type Participant = Schemas["Participant"];
export type Session = Schemas["SessionBody"];
export type SyncProgress = Schemas["SyncProgress"];
export type SyncStatus = Schemas["SyncStatus"];
export type Thread = Schemas["Thread"];
export type ThreadDetail = Schemas["ThreadDetail"];
export type ThreadPage = Schemas["ThreadList"];
export type OperationResult = Schemas["OperationResult"];
