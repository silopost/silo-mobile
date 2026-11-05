import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { useAuth } from "../../state/auth";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";
import { fetchInlineImages, messageHtmlQuery } from "./messageHtml";

setupMsw();

beforeEach(() => {
  resetAuth();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

describe("messageHtmlQuery", () => {
  it("retries a 503 after Retry-After and returns the HTML", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/messages/m_1/html`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { code: "content_not_available", status: 503, title: "Service Unavailable" },
            { status: 503, headers: { "Retry-After": "1" } },
          );
        }
        return new HttpResponse("<p>Treść</p>", { headers: { "Content-Type": "text/html" } });
      }),
    );
    const qc = new QueryClient();
    const started = Date.now();

    const html = await qc.fetchQuery(messageHtmlQuery("m_1"));

    expect(html).toBe("<p>Treść</p>");
    expect(calls).toBe(2);
    // Waited the advised second, not the default delay.
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  });

  it("does not retry other errors", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/messages/m_1/html`, () => {
        calls += 1;
        return HttpResponse.json({ code: "not_found", status: 404 }, { status: 404 });
      }),
    );
    const qc = new QueryClient();
    await expect(qc.fetchQuery(messageHtmlQuery("m_1"))).rejects.toMatchObject({ status: 404 });
    expect(calls).toBe(1);
  });
});

describe("fetchInlineImages", () => {
  it("fetches cid images with the bearer header as data URIs", async () => {
    let auth: string | null = null;
    let url = "";
    server.use(
      http.get(`${API}/attachments/a_44`, ({ request }) => {
        auth = request.headers.get("authorization");
        url = request.url;
        return new HttpResponse(new Uint8Array([102, 111, 111]), {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );

    const out = await fetchInlineImages('<img src="/api/v1/attachments/a_44?inline=1">', [
      {
        id: "a_44",
        contentType: "image/png",
        size: 3,
        inline: true,
        filename: "x.png",
        downloaded: true,
      },
    ]);

    expect(out).toEqual({ a_44: "data:image/png;base64,Zm9v" });
    expect(auth).toBe("Bearer tok_1");
    expect(url).not.toContain("tok_1");
  });

  it("skips images over the 5 MB budget without fetching them", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/attachments/a_1`, () => {
        calls += 1;
        return new HttpResponse(new Uint8Array([1]));
      }),
    );
    const out = await fetchInlineImages('<img src="/api/v1/attachments/a_1?inline=1">', [
      {
        id: "a_1",
        contentType: "image/png",
        size: 6 * 1024 * 1024,
        inline: true,
        filename: "big.png",
        downloaded: true,
      },
    ]);
    expect(out).toEqual({});
    expect(calls).toBe(0);
  });
});
