import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { connectEvents, resetEventPosition } from "../../api/events";
import { useAuth } from "../../state/auth";
import { setConnection } from "../../state/connection";

/** Whether the app is on screen: `background` and `inactive` (iOS switcher) are not. */
const foreground = (state: string | null | undefined) =>
  state !== "background" && state !== "inactive";

/**
 * Feeds TanStack Query's focus and online state from React Native (it reads window events, which
 * React Native lacks): a return to the foreground refetches stale queries like a window focus, and
 * queries pause without network and refetch when it is back. Returns the cleanup.
 */
export function setupQueryManagers(): () => void {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (s) => setFocused(s === "active"));
    return () => sub.remove();
  });
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)),
  );
  return () => {
    focusManager.setEventListener(() => undefined);
    onlineManager.setEventListener(() => undefined);
  };
}

/**
 * Safety net after the stream was closed (background, no network): the lists, labels and sync
 * status may have missed changes, as refetchOnWindowFocus does on the web (plan 3.14). Only the
 * queries on screen refetch; the others are marked stale.
 */
function refreshAfterGap(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["threads"] });
  void qc.invalidateQueries({ queryKey: ["labels"] });
  void qc.invalidateQueries({ queryKey: ["syncStatus"] });
}

/**
 * Keeps the event stream open while the user is signed in and the app is in the foreground
 * (plan 3.14: no SSE in the background, push covers that in phase 6). Mounted once by the layout
 * of the signed-in screens. Going to the background closes the stream or polling; coming back
 * reconnects with Last-Event-ID and refreshes the lists. Signing out disconnects and forgets the
 * event position.
 */
export function useEvents(): void {
  const status = useAuth((s) => s.status);
  const qc = useQueryClient();

  useEffect(() => {
    if (status !== "signedIn") {
      if (status === "signedOut") resetEventPosition();
      setConnection("connecting");
      return;
    }
    let disconnect: (() => void) | undefined;
    let online = true;
    const connect = () => {
      disconnect?.();
      disconnect = connectEvents(qc);
    };
    const close = () => {
      disconnect?.();
      disconnect = undefined;
      setConnection("connecting");
    };

    if (foreground(AppState.currentState)) connect();
    const appState = AppState.addEventListener("change", (next) => {
      if (!foreground(next)) {
        if (disconnect) close();
      } else if (!disconnect) {
        refreshAfterGap(qc);
        connect();
      }
    });
    const network = NetInfo.addEventListener((s) => {
      const now = s.isConnected !== false;
      // Back online in the foreground: reconnect now instead of after the backoff or poll timer.
      if (now && !online && disconnect) {
        refreshAfterGap(qc);
        connect();
      }
      online = now;
    });
    return () => {
      appState.remove();
      network();
      close();
    };
  }, [status, qc]);
}
