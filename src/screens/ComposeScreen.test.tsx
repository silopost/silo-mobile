import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { composeConfig, resetSessions } from "../features/compose/session";
import { useCompose } from "../state/compose";
import { hideToast } from "../state/toasts";
import { typeInEditor } from "../test/editor";
import { draft, labels, sessionBody, thread, threadPage } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

setupMsw();

const autosaveMs = composeConfig.autosaveMs;
let calls: string[];
let created: unknown[];
let puts: Record<string, unknown>[];

beforeAll(() => {
  // Saves in these tests come from blur, send and close, not from the idle timer.
  composeConfig.autosaveMs = 60_000;
});
afterAll(() => {
  composeConfig.autosaveMs = autosaveMs;
});

beforeEach(() => {
  resetAuth();
  resetSessions();
  hideToast();
  useCompose.setState({ remoteVersions: {}, failures: {} });
  signIn();
  calls = [];
  created = [];
  puts = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/meta`, () =>
      HttpResponse.json({ serverVersion: "0.3.0", maxAttachmentBytes: 25 * 1024 * 1024 }),
    ),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json({}, { status: 404 })),
    http.get(`${API}/threads`, () => HttpResponse.json(threadPage([thread({})]))),
    http.get(`${API}/contacts/autocomplete`, () => HttpResponse.json({ contacts: [] })),
    http.post(`${API}/drafts`, async ({ request }) => {
      calls.push("POST /drafts");
      created.push(await request.json());
      return HttpResponse.json(draft({ to: null }), { status: 201 });
    }),
    http.get(`${API}/drafts/d_1`, () => {
      calls.push("GET /drafts/d_1");
      return HttpResponse.json(draft({ subject: "Oferta", bodyHtml: "<p>Treść</p>" }));
    }),
    http.put(`${API}/drafts/d_1`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      calls.push("PUT /drafts/d_1");
      puts.push(body);
      return HttpResponse.json(
        draft({
          version: Number(body.version) + 1,
          subject: String(body.subject),
          to: body.to as never,
        }),
      );
    }),
    http.delete(`${API}/drafts/d_1`, () => {
      calls.push("DELETE /drafts/d_1");
      return new HttpResponse(null, { status: 204 });
    }),
  );
});
afterEach(() => resetSessions());

const sendResult = () => ({
  messageId: "m_9",
  outboundId: "o_1",
  undoUntil: new Date(Date.now() + 10_000).toISOString(),
});

async function addRecipient(email: string) {
  const input = await screen.findByLabelText("Dodaj odbiorców: Do");
  await fireEvent.changeText(input, email);
  await fireEvent(input, "submitEditing");
}

describe("ComposeScreen", () => {
  it("the FAB creates a draft of the list's account and shows Od", async () => {
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByLabelText("Utwórz"));

    expect(await screen.findByLabelText("Od: ala@example.com")).toBeOnTheScreen();
    expect(created).toEqual([{ accountId: "acc_1" }]);
    expect(app.getPathname()).toBe("/compose");
    expect(app.getSearchParams()).toMatchObject({ draftId: "d_1" });
    // No recipient yet: send is disabled.
    expect(screen.getByLabelText("Wyślij")).toBeDisabled();
  });

  it("closing a new draft nobody wrote in deletes it", async () => {
    await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByLabelText("Utwórz"));
    await screen.findByLabelText("Od: ala@example.com");

    await fireEvent.press(screen.getByLabelText("Zapisz i zamknij"));
    await waitFor(() => expect(calls).toContain("DELETE /drafts/d_1"));
  });

  it("closing an edited draft saves it with syncNow and says so", async () => {
    await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByLabelText("Utwórz"));
    await addRecipient("jan@example.com");
    await typeInEditor("<p>Cześć</p>");

    await fireEvent.press(screen.getByLabelText("Zapisz i zamknij"));
    await waitFor(() => expect(puts.at(-1)).toMatchObject({ syncNow: true }));
    expect(puts.at(-1)).toMatchObject({
      to: [{ email: "jan@example.com" }],
      bodyHtml: "<p>Cześć</p>",
      bodyJson: { type: "doc", html: "<p>Cześć</p>" },
    });
    expect(await screen.findByText("Zapisano wersję roboczą")).toBeOnTheScreen();
    expect(calls).not.toContain("DELETE /drafts/d_1");
  });

  it("send: PUT, then POST send, 'Wysłano · Cofnij' on the list, Cofnij reopens the draft", async () => {
    server.use(
      http.post(`${API}/drafts/d_1/send`, () => {
        calls.push("SEND");
        return HttpResponse.json(sendResult());
      }),
      http.post(`${API}/outbound/o_1/cancel`, () => {
        calls.push("CANCEL");
        return HttpResponse.json(draft({ version: 4, subject: "Wróciło" }));
      }),
    );
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByLabelText("Utwórz"));
    await addRecipient("jan@example.com");
    await fireEvent.changeText(screen.getByLabelText("Temat"), "Wróciło");

    await fireEvent.press(screen.getByLabelText("Wyślij"));

    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox"));
    expect(calls.filter((c) => c !== "GET /drafts/d_1")).toEqual([
      "POST /drafts",
      "PUT /drafts/d_1",
      "SEND",
    ]);
    expect(await screen.findByText("Wysłano")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Cofnij"));

    await waitFor(() => expect(app.getPathname()).toBe("/compose"));
    expect(calls).toContain("CANCEL");
    expect(app.getSearchParams()).toMatchObject({ draftId: "d_1" });
    expect(await screen.findByDisplayValue("Wróciło")).toBeOnTheScreen();
    expect(await screen.findByText("Wysyłanie cofnięte")).toBeOnTheScreen();
  });

  it("Cofnij too late says the message was sent", async () => {
    server.use(
      http.post(`${API}/drafts/d_1/send`, () => HttpResponse.json(sendResult())),
      http.post(`${API}/outbound/o_1/cancel`, () =>
        HttpResponse.json({ status: 409, code: "send_in_progress" }, { status: 409 }),
      ),
    );
    const app = await renderApp("/compose?draftId=d_1");
    await screen.findByDisplayValue("Oferta");
    await fireEvent.press(screen.getByLabelText("Wyślij"));
    await fireEvent.press(await screen.findByText("Cofnij"));

    expect(await screen.findByText("Za późno, wiadomość została wysłana")).toBeOnTheScreen();
    expect(app.getPathname()).not.toBe("/compose");
  });

  it("422 invalid_address marks the recipient red and stays open", async () => {
    server.use(
      http.post(`${API}/drafts/d_1/send`, () =>
        HttpResponse.json(
          { status: 422, code: "invalid_address", address: "jan@example.com", field: "to" },
          { status: 422 },
        ),
      ),
    );
    const app = await renderApp("/compose?draftId=d_1");
    await screen.findByDisplayValue("Oferta");
    await fireEvent.press(screen.getByLabelText("Wyślij"));

    expect(
      await screen.findByText(
        "Nieprawidłowy adres odbiorcy: jan@example.com. Popraw adres oznaczony na czerwono.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Jan, Nieprawidłowy adres" })).toBeOnTheScreen();
    expect(app.getPathname()).toBe("/compose");
  });

  it("Odrzuć asks first, then deletes the draft", async () => {
    await renderApp("/compose?draftId=d_1");
    await screen.findByDisplayValue("Oferta");
    await fireEvent.press(screen.getByLabelText("Więcej opcji wiadomości"));
    await fireEvent.press(await screen.findByText("Odrzuć"));
    expect(await screen.findByText("Odrzucić wersję roboczą?")).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("confirm-discard"));
    await waitFor(() => expect(calls).toContain("DELETE /drafts/d_1"));
    expect(await screen.findByText("Odrzucono wersję roboczą")).toBeOnTheScreen();
  });

  it("a newer version saved elsewhere offers Wczytaj / Nadpisz", async () => {
    await renderApp("/compose?draftId=d_1");
    await screen.findByDisplayValue("Oferta");
    server.use(
      http.get(`${API}/drafts/d_1`, () =>
        HttpResponse.json(draft({ version: 3, subject: "Z telefonu żony" })),
      ),
    );
    useCompose.getState().setRemoteVersion("d_1", 3);

    expect(await screen.findByText("Wersja robocza zmieniona w innym miejscu")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Wczytaj"));
    expect(await screen.findByDisplayValue("Z telefonu żony")).toBeOnTheScreen();
    expect(screen.queryByText("Wersja robocza zmieniona w innym miejscu")).toBeNull();
  });

  it("a failed send of the draft shows a red bar", async () => {
    server.use(
      http.get(`${API}/drafts/d_1`, () =>
        HttpResponse.json(
          draft({
            lastSend: {
              status: "failed",
              error: "550 no such user",
              failedRecipients: ["jan@example.com"],
              outboundId: "o_1",
              updatedAt: "2026-11-05T10:00:00Z",
            },
          }),
        ),
      ),
    );
    await renderApp("/compose?draftId=d_1");
    expect(
      await screen.findByText(
        "Nie udało się wysłać: 550 no such user Odrzuceni odbiorcy: jan@example.com",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Jan, Nieprawidłowy adres" })).toBeOnTheScreen();
  });
});
