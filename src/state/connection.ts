import { create } from "zustand";

/**
 * Connection of the app to silo-server's events: the SSE stream (live), its polling fallback, or
 * nothing (server unreachable → offline banner). "connecting" before the first answer and while
 * the app is in the background (no stream there, plan 3.14).
 */
export type ConnectionState = "connecting" | "live" | "polling" | "offline";

export const useConnection = create<{ state: ConnectionState }>()(() => ({ state: "connecting" }));

export const setConnection = (state: ConnectionState) => useConnection.setState({ state });
