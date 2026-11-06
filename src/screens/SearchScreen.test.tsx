import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { labels, sessionBody, thread, threadPage } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

type Suggestion = components["schemas"]["SearchSuggestion"];

setupMsw();

let suggestQueries: string[];
let threadQueries: string[];
let deletes: string[];

const history: Suggestion[] = [
  { kind: "history", text: "faktura", label: "faktura" },
  { kind: "history", text: "from:jan", label: "from:jan" },
];

function serveMeta(serverVersion: string) {
  server.use(
    http.get(`${API}/meta`, () =>
      HttpResponse.json({
        serverVersion,
        apiVersion: "v1",
        authMode: "imap",
        allowCustomServers: true,
        maxAttachmentBytes: 1,
        minWebVersion: "0.3.0",
      }),
    ),
  );
}

beforeEach(() => {
  resetAuth();
  signIn();
  suggestQueries = [];
  threadQueries = [];
  deletes = [];
  serveMeta("0.4.0");
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json({}, { status: 404 })),
    http.get(`${API}/search/suggest`, ({ request }) => {
      const q = new URL(request.url).searchParams.get("q") ?? "";
      suggestQueries.push(q);
      if (q === "") return HttpResponse.json({ suggestions: history });
      return HttpResponse.json({
        suggestions: [
          { kind: "history", text: "jan kowalski", label: "jan kowalski" },
          {
            kind: "contact",
            text: "from:jan@example.com ",
            label: "Jan Kowalski <jan@example.com>",
          },
          { kind: "operator", text: "is:unread", label: "is:unread" },
        ],
      });
    }),
    http.delete(`${API}/search/history`, ({ request }) => {
      deletes.push(new URL(request.url).search);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${API}/threads`, ({ request }) => {
      const url = new URL(request.url);
      threadQueries.push(url.searchParams.get("q") ?? "");
      expect(url.searchParams.get("labelId")).toBeNull();
      return HttpResponse.json({
        ...threadPage([thread({ id: "t_1" }), thread({ id: "t_2", subject: "Faktura 11/2026" })]),
        resultSizeEstimate: 42,
      });
    }),
  );
});

describe("SearchScreen", () => {
  it("lists recent searches before typing and forgets one or all of them", async () => {
    await renderApp("/u/0/search");

    expect(await screen.findByText("Ostatnie wyszukiwania")).toBeOnTheScreen();
    expect(screen.getByText("faktura")).toBeOnTheScreen();
    expect(suggestQueries).toContain("");

    await fireEvent.press(screen.getByLabelText("Usuń z historii: faktura"));
    await waitFor(() => expect(deletes).toEqual(["?accountId=acc_1&query=faktura"]));

    await fireEvent.press(await screen.findByText("Wyczyść wszystko"));
    await waitFor(() => expect(deletes).toHaveLength(2));
    expect(deletes[1]).toBe("?accountId=acc_1");
  });

  it("asks the server for suggestions while typing and inserts the chosen one", async () => {
    await renderApp("/u/0/search");
    const input = await screen.findByTestId("search-input");

    await fireEvent.changeText(input, "jan");
    const contact = await screen.findByLabelText("Kontakt: Jan Kowalski <jan@example.com>");
    expect(suggestQueries).toContain("jan");
    // Each kind has its icon; the text is the server's.
    expect(screen.getByLabelText("Operator: is:unread")).toBeOnTheScreen();

    await fireEvent.press(contact);
    expect(input).toHaveDisplayValue("from:jan@example.com ");
    // Taking a suggestion does not search yet.
    expect(threadQueries).toEqual([]);
  });

  it("searches the query as typed and lists the results", async () => {
    const app = await renderApp("/u/0/search");
    const input = await screen.findByTestId("search-input");

    await fireEvent.changeText(input, "faktura has:attachment");
    await fireEvent(input, "submitEditing");

    expect(await screen.findByText("Faktura 11/2026")).toBeOnTheScreen();
    expect(threadQueries).toEqual(["faktura has:attachment"]);
    expect(app.getSearchParams()).toMatchObject({ q: "faktura has:attachment" });

    await fireEvent.press(screen.getByTestId("thread-t_2"));
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/search/t_2"));
  });

  it("a recent search runs at once", async () => {
    await renderApp("/u/0/search");
    await fireEvent.press(await screen.findByTestId("suggestion-from:jan"));
    await waitFor(() => expect(threadQueries).toEqual(["from:jan"]));
  });

  it("against a 0.3.0 server searches the text only, without suggestions", async () => {
    serveMeta("0.3.0");
    await renderApp("/u/0/search");
    const input = await screen.findByTestId("search-input");
    await fireEvent.changeText(input, "jan");
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText("Ostatnie wyszukiwania")).toBeNull();
    expect(suggestQueries).toEqual([]);

    await fireEvent(input, "submitEditing");
    await waitFor(() => expect(threadQueries).toEqual(["jan"]));
  });
});
