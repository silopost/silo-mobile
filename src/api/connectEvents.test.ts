import { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { label } from "../test/fixtures";
import { API, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";
import { signIn } from "../test/router";
import { useAuth } from "../state/auth";
import { useConnection } from "../state/connection";
import { connectEvents, eventPosition, eventsConfig, resetEventPosition } from "./events";
import { keys } from "./keys";
import type { LabelsData } from "./mutations/cache";
import type { SseHandlers } from "./sse";

setupMsw();

type Attempt = { url: string; headers: Record<string, string>; h: SseHandlers; closed: boolean };
const original = { ...eventsConfig };
let attempts: Attempt[];
let qc: QueryClient;
let stop: (() => void) | undefined;
let afters: string[];

const last = () => attempts[attempts.length - 1]!;
const counts = (unread: number) => ({
  accountId: "acc_1",
  labels: [{ id: "INBOX", threadsUnread: unread, threadsTotal: 9 }],
});
const unread = () => qc.getQueryData<LabelsData>(keys.labels("acc_1"))!.labels![0]!.threadsUnread;

beforeEach(() => {
  resetAuth();
  signIn();
  resetEventPosition();
  useConnection.setState({ state: "connecting" });
  attempts = [];
  afters = [];
  Object.assign(eventsConfig, {
    backoffMinMs: 1,
    backoffMaxMs: 5,
    pollIntervalMs: 20,
    sseRetryMs: 60_000,
    createEventSource: (url: string, headers: Record<string, string>, h: SseHandlers) => {
      const a: Attempt = { url, headers, h, closed: false };
      attempts.push(a);
      return { close: () => (a.closed = true) };
    },
  });
  qc = new QueryClient();
  qc.setQueryData(keys.labels("acc_1"), { labels: [label({ id: "INBOX", threadsUnread: 1 })] });
  server.use(http.get(`${API}/meta`, () => HttpResponse.json({ version: "0.3.0" })));
});

afterEach(() => {
  stop?.();
  stop = undefined;
  Object.assign(eventsConfig, original);
});

function servePoll(answer: (after: string) => object) {
  server.use(
    http.get(`${API}/events/poll`, ({ request }) => {
      const after = new URL(request.url).searchParams.get("after") ?? "";
      afters.push(after);
      return HttpResponse.json(answer(after));
    }),
  );
}

describe("connectEvents", () => {
  it("streams with bearer and client headers and applies the events", async () => {
    stop = connectEvents(qc);
    await waitFor(() => expect(attempts).toHaveLength(1));
    const a = last();
    expect(a.url).toBe(`${API}/events`);
    expect(a.headers.Authorization).toBe("Bearer tok_1");
    expect(a.headers["X-Silo-Client"]).toMatch(/^silo-mobile\/\d+\.\d+\.\d+#.+/);
    expect(a.headers["Last-Event-ID"]).toBeUndefined();

    a.h.onOpen();
    expect(useConnection.getState().state).toBe("live");
    a.h.onEvent({ type: "label.counts", id: "41", data: JSON.stringify(counts(4)) });
    a.h.onEvent({ type: "label.counts", id: "42", data: "not json" });
    expect(unread()).toBe(4);
    // A malformed event still moves the position: replaying it would not parse either.
    expect(eventPosition()).toBe(42);
  });

  it("reconnects with Last-Event-ID after the stream drops, never with the token in the URL", async () => {
    stop = connectEvents(qc);
    await waitFor(() => expect(attempts).toHaveLength(1));
    attempts[0]!.h.onOpen();
    attempts[0]!.h.onEvent({ type: "resync", id: "7", data: "{}" });
    attempts[0]!.h.onError({});

    await waitFor(() => expect(attempts).toHaveLength(2));
    expect(last().headers["Last-Event-ID"]).toBe("7");
    expect(last().url).not.toContain("tok_1");
    expect(last().url).not.toContain("?");
  });

  it("falls back to /events/poll after 3 failures and follows nextAfter", async () => {
    servePoll((after) =>
      after === "7"
        ? { events: [{ id: 8, type: "label.counts", data: counts(5) }], nextAfter: 8 }
        : { events: [], nextAfter: Number(after) },
    );
    stop = connectEvents(qc);
    await waitFor(() => expect(attempts).toHaveLength(1));
    attempts[0]!.h.onOpen();
    attempts[0]!.h.onEvent({ type: "message.new", id: "7", data: "{}" });
    for (let i = 1; i <= 3; i++) {
      await waitFor(() => expect(attempts).toHaveLength(i));
      last().h.onError({});
    }

    await waitFor(() => expect(unread()).toBe(5));
    await waitFor(() => expect(afters.slice(0, 2)).toEqual(["7", "8"]));
    expect(attempts).toHaveLength(3);
    expect(useConnection.getState().state).toBe("polling");
    expect(eventPosition()).toBe(8);
  });

  it("skips the backlog of a first poll without a position and refetches everything", async () => {
    eventsConfig.createEventSource = () => null;
    servePoll((after) =>
      after === "0"
        ? { events: [{ id: 3, type: "label.counts", data: counts(9) }], nextAfter: 3 }
        : { events: [], nextAfter: 3 },
    );
    stop = connectEvents(qc);

    await waitFor(() => expect(eventPosition()).toBe(3));
    expect(afters[0]).toBe("0");
    expect(qc.getQueryState(keys.labels("acc_1"))!.isInvalidated).toBe(true);
    expect(unread()).toBe(1);
  });

  it("goes back to SSE after the retry timer and stops polling once it opens", async () => {
    eventsConfig.sseRetryMs = 60;
    servePoll((after) => ({ events: [], nextAfter: Number(after) || 1 }));
    stop = connectEvents(qc);
    for (let i = 1; i <= 3; i++) {
      await waitFor(() => expect(attempts).toHaveLength(i));
      last().h.onError({});
    }
    await waitFor(() => expect(useConnection.getState().state).toBe("polling"));

    await waitFor(() => expect(attempts).toHaveLength(4));
    expect(last().headers["Last-Event-ID"]).toBe("1");
    last().h.onOpen();
    expect(useConnection.getState().state).toBe("live");
    // A poll already in flight may still land; no new one is scheduled after it.
    await new Promise((r) => setTimeout(r, 100));
    const polled = afters.length;
    await new Promise((r) => setTimeout(r, 150));
    expect(afters.length).toBe(polled);
  });

  it("returns to polling when a retried stream fails again", async () => {
    eventsConfig.sseRetryMs = 40;
    servePoll((after) => ({ events: [], nextAfter: Number(after) || 1 }));
    stop = connectEvents(qc);
    for (let i = 1; i <= 3; i++) {
      await waitFor(() => expect(attempts).toHaveLength(i));
      last().h.onError({});
    }
    await waitFor(() => expect(attempts).toHaveLength(4));
    last().h.onError({});
    // The next retry is scheduled again, polling goes on meanwhile.
    await waitFor(() => expect(attempts).toHaveLength(5));
    expect(useConnection.getState().state).toBe("polling");
  });

  it("shows offline when Silo does not answer", async () => {
    server.use(http.get(`${API}/meta`, () => HttpResponse.error()));
    stop = connectEvents(qc);
    await waitFor(() => expect(attempts).toHaveLength(1));
    attempts[0]!.h.onError({});
    await waitFor(() => expect(useConnection.getState().state).toBe("offline"));
  });

  it("stops on a 401 from the stream and signs out instead of looping", async () => {
    stop = connectEvents(qc);
    await waitFor(() => expect(attempts).toHaveLength(1));
    attempts[0]!.h.onError({ status: 401 });

    await waitFor(() => expect(useAuth.getState().status).toBe("signedOut"));
    await new Promise((r) => setTimeout(r, 30));
    expect(attempts).toHaveLength(1);
  });

  it("does nothing more once disconnected", async () => {
    stop = connectEvents(qc);
    await waitFor(() => expect(attempts).toHaveLength(1));
    stop();
    expect(attempts[0]!.closed).toBe(true);
    attempts[0]!.h.onEvent({ type: "label.counts", id: "5", data: JSON.stringify(counts(7)) });
    attempts[0]!.h.onError({});
    await new Promise((r) => setTimeout(r, 30));
    expect(unread()).toBe(1);
    expect(attempts).toHaveLength(1);
  });
});
