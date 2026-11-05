/** One event of a text/event-stream: its type ("message" when unnamed), last id and data. */
export type SseMessage = { type: string; id: string | undefined; data: string };

export type SseHandlers = {
  /** The server answered 200 with a body stream. */
  onOpen: () => void;
  onEvent: (message: SseMessage) => void;
  /**
   * The attempt is over: a non-2xx answer (`status`), a network error or the stream ended. Called
   * at most once, never after close(); the source does not reconnect by itself.
   */
  onError: (error: { status?: number }) => void;
};

export type SseSource = { close: () => void };

/**
 * Incremental parser of the text/event-stream format (WHATWG HTML, "Server-sent events"): feed it
 * decoded chunks as they arrive, it returns the events completed so far.
 */
export class SseParser {
  private buffer = "";
  private type = "";
  private data: string[] = [];
  private id: string | undefined;

  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const out: SseMessage[] = [];
    for (;;) {
      const match = /\r\n|\r|\n/.exec(this.buffer);
      // A trailing \r may be the first half of \r\n: wait for the next chunk.
      if (!match || (match[0] === "\r" && match.index === this.buffer.length - 1)) break;
      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const event = this.line(line);
      if (event) out.push(event);
    }
    return out;
  }

  private line(line: string): SseMessage | undefined {
    if (line === "") {
      // A blank line dispatches the event; one without data is dropped.
      if (this.data.length === 0) {
        this.type = "";
        return undefined;
      }
      const event = { type: this.type || "message", id: this.id, data: this.data.join("\n") };
      this.type = "";
      this.data = [];
      return event;
    }
    if (line.startsWith(":")) return undefined; // comment, e.g. the server's ": ping"
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") this.type = value;
    else if (field === "data") this.data.push(value);
    else if (field === "id" && !value.includes("\0")) this.id = value;
    // "retry" is ignored: reconnecting is decided by connectEvents.
    return undefined;
  }
}

/**
 * Opens a text/event-stream with fetch. React Native has no EventSource; Expo SDK 58's global
 * fetch is expo/fetch, whose Response.body is a ReadableStream filled while the answer arrives,
 * so request headers (Authorization: Bearer, Last-Event-ID) can be set (ADR 0007: never the token
 * in the query). A fetch without a body stream (React Native's own, EXPO_PUBLIC_USE_RN_FETCH)
 * counts as a failed attempt and the caller falls back to polling.
 */
export function fetchEventSource(
  url: string,
  headers: Record<string, string>,
  handlers: SseHandlers,
): SseSource {
  const abort = new AbortController();
  let done = false;
  const fail = (error: { status?: number }) => {
    if (done) return;
    done = true;
    abort.abort();
    handlers.onError(error);
  };

  void (async () => {
    try {
      // Resolved per call so tests (msw) can answer it.
      const res = await globalThis.fetch(url, {
        headers: { Accept: "text/event-stream", "Cache-Control": "no-cache", ...headers },
        signal: abort.signal,
      });
      if (!res.ok || !res.body) return fail({ status: res.ok ? undefined : res.status });
      if (done) return;
      handlers.onOpen();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SseParser();
      for (;;) {
        const { done: end, value } = await reader.read();
        if (done) return;
        if (end) break;
        for (const event of parser.push(decoder.decode(value, { stream: true }))) {
          if (done) return;
          handlers.onEvent(event);
        }
      }
      fail({});
    } catch {
      fail({});
    }
  })();

  return {
    close: () => {
      done = true;
      abort.abort();
    },
  };
}
