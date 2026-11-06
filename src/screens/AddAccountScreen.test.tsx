import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { account, labels, sessionBody, syncStatus, threadPage } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

type Meta = components["schemas"]["Meta"];
type TestResult = components["schemas"]["TestResult"];

setupMsw();

const meta = (allowCustomServers: boolean): Meta => ({
  serverVersion: "0.3.0",
  apiVersion: "1",
  minWebVersion: "0.3.0",
  authMode: "imap",
  allowCustomServers,
  maxAttachmentBytes: 26214400,
});

const failed: TestResult = {
  imap: {
    ok: false,
    steps: [
      { step: "connect", ok: true, ms: 15 },
      { step: "login", ok: false, ms: 40, detail: "AUTHENTICATIONFAILED" },
    ],
  },
  smtp: { ok: true, steps: [{ step: "auth", ok: true, ms: 22 }] },
};

const added = { ...account, id: "acc_2", email: "nowe@example.com", position: 1 };
let accounts: (typeof account)[];
let allowCustom: boolean;

beforeEach(() => {
  resetAuth();
  signIn();
  accounts = [account];
  allowCustom = false;
  server.use(
    http.get(`${API}/meta`, () => HttpResponse.json(meta(allowCustom))),
    http.get(`${API}/session`, () => HttpResponse.json({ ...sessionBody, accounts })),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/threads`, () => HttpResponse.json(threadPage([]))),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json(syncStatus({}))),
  );
});

async function fill(email = "nowe@example.com", password = "tajne") {
  await fireEvent.changeText(await screen.findByLabelText("Adres e-mail"), email);
  await fireEvent.changeText(screen.getByLabelText("Hasło"), password);
}

describe("add account", () => {
  it("opens from the account switcher", async () => {
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByLabelText(/^Konto ala@example.com/));
    await fireEvent.press(await screen.findByRole("button", { name: "Dodaj konto" }));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/add-account"));
  });

  it("hides the server fields when the instance allows no other servers", async () => {
    await renderApp("/settings/add-account");
    await fireEvent.press(await screen.findByText("Ustawienia zaawansowane"));

    expect(await screen.findByTestId("default-server")).toHaveTextContent(
      /pozwala dodawać tylko konta na swoim domyślnym serwerze/,
    );
    expect(screen.getByLabelText("Nazwa użytkownika (domyślnie adres e-mail)")).toBeOnTheScreen();
    expect(screen.queryByTestId("imap-host")).toBeNull();
    expect(screen.queryByTestId("smtp-host")).toBeNull();
  });

  it("shows the server fields with allowCustomServers and sends them", async () => {
    allowCustom = true;
    let body: unknown;
    server.use(
      http.post(`${API}/accounts/test`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(failed);
      }),
    );
    await renderApp("/settings/add-account");
    await fill();
    await fireEvent.press(screen.getByText("Ustawienia zaawansowane"));
    await fireEvent.changeText(await screen.findByTestId("imap-host"), "imap.inny.pl");
    await fireEvent.changeText(screen.getByTestId("imap-port"), "143");
    await fireEvent.press(screen.getByLabelText("Zabezpieczenia IMAP: STARTTLS"));
    await fireEvent.press(screen.getByText("Sprawdź połączenie"));

    await waitFor(() =>
      expect(body).toEqual({
        email: "nowe@example.com",
        password: "tajne",
        imapHost: "imap.inny.pl",
        imapPort: 143,
        imapTls: "starttls",
      }),
    );
  });

  it("'Sprawdź połączenie' lists the steps of POST /accounts/test", async () => {
    server.use(http.post(`${API}/accounts/test`, () => HttpResponse.json(failed)));
    await renderApp("/settings/add-account");
    await fill();
    await fireEvent.press(screen.getByText("Sprawdź połączenie"));

    const imap = await screen.findByTestId("test-imap");
    expect(within(imap).getByText("IMAP: Połączenie nie działa")).toBeOnTheScreen();
    expect(within(imap).getByText("✓ Połączenie")).toBeOnTheScreen();
    expect(within(imap).getByText("✗ Logowanie")).toBeOnTheScreen();
    expect(within(imap).getByText("AUTHENTICATIONFAILED")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("test-smtp")).getByText("SMTP: Połączenie działa"),
    ).toBeOnTheScreen();
  });

  it("shows the steps of 422 account_test_failed on 'Dodaj'", async () => {
    server.use(
      http.post(`${API}/accounts`, () =>
        HttpResponse.json(
          { code: "account_test_failed", status: 422, title: "x", test: failed },
          { status: 422 },
        ),
      ),
    );
    await renderApp("/settings/add-account");
    await fill();
    await fireEvent.press(screen.getByTestId("add-account-submit"));

    expect(await screen.findByText(/Nie udało się połączyć z kontem/)).toBeOnTheScreen();
    expect(within(screen.getByTestId("test-imap")).getByText("✗ Logowanie")).toBeOnTheScreen();
  });

  it("shows the account limit with the server's detail", async () => {
    server.use(
      http.post(`${API}/accounts`, () =>
        HttpResponse.json(
          {
            code: "account_limit_reached",
            status: 409,
            detail: "The account limit for this user is reached.",
          },
          { status: 409 },
        ),
      ),
    );
    await renderApp("/settings/add-account");
    await fill();
    await fireEvent.press(screen.getByTestId("add-account-submit"));

    const error = await screen.findByTestId("add-account-error");
    expect(error).toHaveTextContent(/Osiągnięto limit kont/);
    expect(error).toHaveTextContent(/The account limit for this user is reached\./);
    expect(screen.queryByText(/tajne/)).toBeNull();
  });

  it("asks for the address and password before sending anything", async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/accounts`, () => {
        calls += 1;
        return HttpResponse.json(added, { status: 201 });
      }),
    );
    await renderApp("/settings/add-account");
    await fireEvent.press(await screen.findByTestId("add-account-submit"));

    expect(await screen.findByText("Podaj adres e-mail i hasło")).toBeOnTheScreen();
    expect(calls).toBe(0);
  });

  it("adds the account and opens its Inbox", async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/accounts`, async ({ request }) => {
        body = await request.json();
        accounts = [account, added];
        return HttpResponse.json(added, { status: 201 });
      }),
    );
    const app = await renderApp("/settings/add-account");
    await fill();
    await fireEvent.changeText(screen.getByLabelText("Nazwa wyświetlana (opcjonalnie)"), "Nowe");
    await fireEvent.press(screen.getByTestId("add-account-submit"));

    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
    expect(body).toEqual({ email: "nowe@example.com", password: "tajne", displayName: "Nowe" });
    expect(
      await screen.findByText("Konto dodane · Trwa pierwsza synchronizacja"),
    ).toBeOnTheScreen();
  });
});
