import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { http, HttpResponse } from "msw";
import { queryClient } from "../../api/cache";
import { useAuth } from "../../state/auth";
import { attachment, message } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { MessageHtml, onLinkRequest } from "./MessageHtml";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
jest.mock("expo-linking", () => ({ openURL: jest.fn(async () => true) }));

setupMsw();

beforeEach(() => {
  queryClient.clear();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

const html = (body: string) =>
  http.get(`${API}/messages/m_1/html`, () =>
    HttpResponse.text(body, { headers: { "Content-Type": "text/html" } }),
  );

const doc = (id = "m_1") =>
  (screen.getByTestId(`message-html-${id}`).props as { source: { html: string } }).source.html;

describe("MessageHtml", () => {
  it("shows a spinner, then the HTML in a WebView", async () => {
    server.use(html("<p>Dzień dobry</p>"));
    await renderScreen(<MessageHtml message={message({})} />);

    expect(screen.getByText("Pobieranie treści…")).toBeOnTheScreen();
    await screen.findByTestId("message-html-m_1");
    expect(doc()).toContain("<p>Dzień dobry</p>");
    expect(screen.getByLabelText("Treść wiadomości")).toBeOnTheScreen();
  });

  it("keeps remote images blocked until 'Pokaż obrazy'", async () => {
    server.use(html('<img src="https://example.com/a.png">'));
    await renderScreen(<MessageHtml message={message({})} />);
    await screen.findByTestId("message-html-m_1");
    expect(doc()).toContain("img-src data: blob:;");

    await fireEvent.press(screen.getByText("Pokaż obrazy"));

    expect(doc()).toContain("img-src data: blob: https: http:");
    expect(screen.queryByText("Pokaż obrazy")).toBeNull();
  });

  it("swaps inline images for data URIs fetched with the bearer header", async () => {
    let auth: string | null = null;
    server.use(
      html('<img src="/api/v1/attachments/a_9?inline=1">'),
      http.get(`${API}/attachments/a_9`, ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(new Uint8Array([102, 111, 111]));
      }),
    );
    const m = message({
      attachments: [attachment({ id: "a_9", inline: true, contentType: "image/gif", size: 3 })],
    });
    await renderScreen(<MessageHtml message={m} />);

    await screen.findByTestId("message-html-m_1");
    expect(doc()).toContain('src="data:image/gif;base64,Zm9v"');
    expect(auth).toBe("Bearer tok_1");
  });

  it("sizes the WebView to the height the document reports", async () => {
    server.use(html("<p>x</p>"));
    await renderScreen(<MessageHtml message={message({})} />);
    const view = await screen.findByTestId("message-html-m_1");
    const props = view.props as { onMessage: (e: unknown) => void };

    await act(async () => props.onMessage({ nativeEvent: { data: "640" } }));

    await waitFor(() =>
      expect(screen.getByTestId("message-html-m_1")).toHaveStyle({ height: 640 }),
    );
  });

  it("offers a retry when the content is not available", async () => {
    server.use(
      http.get(`${API}/messages/m_1/html`, () =>
        HttpResponse.json({ code: "not_found", status: 404 }, { status: 404 }),
      ),
    );
    await renderScreen(<MessageHtml message={message({})} />);
    expect(await screen.findByText("Treść niedostępna")).toBeOnTheScreen();
    server.use(html("<p>jest</p>"));
    await fireEvent.press(screen.getByText("Spróbuj ponownie"));
    await screen.findByTestId("message-html-m_1");
  });
});

describe("onLinkRequest", () => {
  it("loads only the document itself", () => {
    expect(onLinkRequest("about:blank")).toBe(true);
    expect(onLinkRequest("https://example.com/")).toBe(false);
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://example.com/");
    expect(onLinkRequest("mailto:jan@example.com")).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledWith("mailto:jan@example.com");
    expect(onLinkRequest("intent://evil#Intent;end")).toBe(false);
    expect(onLinkRequest("file:///data/x")).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });
});
