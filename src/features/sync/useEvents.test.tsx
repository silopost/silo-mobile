import NetInfo from "@react-native-community/netinfo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppState } from "react-native";
import { eventPosition, eventsConfig, resetEventPosition } from "../../api/events";
import { keys } from "../../api/keys";
import type { SseHandlers } from "../../api/sse";
import { useAuth } from "../../state/auth";
import { useConnection } from "../../state/connection";
import { signIn } from "../../test/router";
import { resetAuth } from "../../test/utils";
import { useEvents } from "./useEvents";

type Attempt = { headers: Record<string, string>; h: SseHandlers; closed: boolean };
const original = { ...eventsConfig };
let attempts: Attempt[];
let qc: QueryClient;

const appState = AppState as unknown as {
  currentState: string;
  addEventListener: jest.Mock;
};
const netInfo = NetInfo.addEventListener as jest.Mock;

/** Moves the app to another AppState, as React Native reports it. */
async function moveTo(state: string) {
  appState.currentState = state;
  await act(async () => {
    for (const [, listener] of appState.addEventListener.mock.calls) listener(state);
  });
}

async function setOnline(isConnected: boolean) {
  await act(async () => {
    for (const [listener] of netInfo.mock.calls) listener({ isConnected });
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  resetAuth();
  signIn();
  resetEventPosition();
  appState.addEventListener.mockClear();
  netInfo.mockClear();
  appState.currentState = "active";
  attempts = [];
  Object.assign(eventsConfig, {
    createEventSource: (_url: string, headers: Record<string, string>, h: SseHandlers) => {
      const a: Attempt = { headers, h, closed: false };
      attempts.push(a);
      return { close: () => (a.closed = true) };
    },
  });
  qc = new QueryClient();
});

afterEach(() => Object.assign(eventsConfig, original));

describe("useEvents", () => {
  it("closes the stream in the background and resumes from the last event", async () => {
    qc.setQueryData(keys.threads("acc_1", {}), { pages: [], pageParams: [] });
    const { unmount } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(attempts).toHaveLength(1));
    attempts[0]!.h.onOpen();
    attempts[0]!.h.onEvent({ type: "message.new", id: "9", data: "{}" });
    expect(useConnection.getState().state).toBe("live");

    await moveTo("background");
    expect(attempts[0]!.closed).toBe(true);
    expect(useConnection.getState().state).toBe("connecting");
    // Refetched after the gap, not by the event (which an open stream would have applied).
    qc.setQueryData(keys.threads("acc_1", {}), { pages: [], pageParams: [] });

    await moveTo("active");
    await waitFor(() => expect(attempts).toHaveLength(2));
    expect(attempts[1]!.headers["Last-Event-ID"]).toBe("9");
    expect(qc.getQueryState(keys.threads("acc_1", {}))!.isInvalidated).toBe(true);
    await unmount();
    expect(attempts[1]!.closed).toBe(true);
  });

  it("treats inactive like the background", async () => {
    await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(attempts).toHaveLength(1));
    await moveTo("inactive");
    expect(attempts[0]!.closed).toBe(true);
  });

  it("does not connect while the app starts in the background", async () => {
    appState.currentState = "background";
    await renderHook(() => useEvents(), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(attempts).toHaveLength(0);

    await moveTo("active");
    await waitFor(() => expect(attempts).toHaveLength(1));
  });

  it("disconnects and forgets the position on sign-out", async () => {
    await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(attempts).toHaveLength(1));
    attempts[0]!.h.onEvent({ type: "resync", id: "4", data: "{}" });
    expect(eventPosition()).toBe(4);

    await act(async () => useAuth.setState({ status: "signedOut", token: null }));
    expect(attempts[0]!.closed).toBe(true);
    expect(eventPosition()).toBeNull();
  });

  it("reconnects at once when the network comes back", async () => {
    await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(attempts).toHaveLength(1));
    await setOnline(false);
    await setOnline(true);
    await waitFor(() => expect(attempts).toHaveLength(2));
    expect(attempts[0]!.closed).toBe(true);
  });
});
