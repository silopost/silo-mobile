import { waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { API, server, setupMsw } from "../test/server";
import { fetchEventSource, SseParser, type SseMessage } from "./sse";

setupMsw();

describe("SseParser", () => {
  it("parses events split across chunks, CRLF and comments", () => {
    const p = new SseParser();
    expect(p.push(": ping\n\nid: 7\nevent: label.co")).toEqual([]);
    expect(p.push('unts\r\ndata: {"a":\r')).toEqual([]);
    expect(p.push("\ndata: 1}\r\n\r\nevent: resync\ndata:{}\n\n")).toEqual([
      { type: "label.counts", id: "7", data: '{"a":\n1}' },
      { type: "resync", id: "7", data: "{}" },
    ]);
  });

  it("names an unnamed event message and drops one without data", () => {
    const p = new SseParser();
    expect(p.push("event: x\n\ndata: y\n\n")).toEqual([
      { type: "message", id: undefined, data: "y" },
    ]);
  });
});

describe("fetchEventSource", () => {
  it("sends the headers, opens and delivers the streamed events", async () => {
    let seen: Request | undefined;
    const encoder = new TextEncoder();
    server.use(
      http.get(`${API}/events`, ({ request }) => {
        seen = request;
        const body = new ReadableStream({
          start(c) {
            c.enqueue(encoder.encode(': ping\n\nid: 8\nevent: resync\ndata: {"x":'));
            c.enqueue(encoder.encode("1}\n\n"));
          },
        });
        return new HttpResponse(body, { headers: { "Content-Type": "text/event-stream" } });
      }),
    );
    const events: SseMessage[] = [];
    const onOpen = jest.fn();
    const onError = jest.fn();
    const source = fetchEventSource(
      `${API}/events`,
      { Authorization: "Bearer tok_1", "Last-Event-ID": "5" },
      { onOpen, onEvent: (e) => events.push(e), onError },
    );
    await waitFor(() => expect(events).toEqual([{ type: "resync", id: "8", data: '{"x":1}' }]));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(seen!.headers.get("Authorization")).toBe("Bearer tok_1");
    expect(seen!.headers.get("Last-Event-ID")).toBe("5");
    expect(seen!.headers.get("Accept")).toBe("text/event-stream");
    expect(new URL(seen!.url).search).toBe("");
    source.close();
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports the status of a refused stream once", async () => {
    server.use(http.get(`${API}/events`, () => HttpResponse.json({}, { status: 401 })));
    const onError = jest.fn();
    const onOpen = jest.fn();
    fetchEventSource(`${API}/events`, {}, { onOpen, onEvent: jest.fn(), onError });
    await waitFor(() => expect(onError).toHaveBeenCalledWith({ status: 401 }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reports the end of the stream", async () => {
    server.use(http.get(`${API}/events`, () => new HttpResponse("data: 1\n\n", { status: 200 })));
    const onError = jest.fn();
    const onEvent = jest.fn();
    fetchEventSource(`${API}/events`, {}, { onOpen: jest.fn(), onEvent, onError });
    await waitFor(() => expect(onError).toHaveBeenCalledWith({}));
    expect(onEvent).toHaveBeenCalledWith({ type: "message", id: undefined, data: "1" });
  });
});
