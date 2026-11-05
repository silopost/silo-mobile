import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { useAuth } from "../state/auth";
import { sessionBody } from "../test/fixtures";
import { renderScreen } from "../test/render";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { resetAuth, secureStore } from "../test/utils";
import { LoginScreen } from "./LoginScreen";

setupMsw();

beforeEach(() => {
  resetAuth();
  server.use(
    http.get(`${API}/meta`, () =>
      HttpResponse.json({
        serverVersion: "0.3.0",
        apiVersion: "1",
        minWebVersion: "0.3.0",
        authMode: "imap",
        allowCustomServers: false,
        maxAttachmentBytes: 26214400,
      }),
    ),
  );
});

const problem = (status: number, code: string, headers?: Record<string, string>) =>
  HttpResponse.json(
    { status, title: "Error", code },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );

async function fillAndSubmit() {
  await renderScreen(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText("Adres serwera"), "silo.test");
  await fireEvent.changeText(screen.getByLabelText("Adres e-mail"), "ala@example.com");
  await fireEvent.changeText(screen.getByLabelText("Hasło"), "secret");
  await fireEvent.press(screen.getByRole("button", { name: "Zaloguj" }));
}

describe("LoginScreen", () => {
  it("starts the server address with https://", async () => {
    await renderScreen(<LoginScreen />);
    expect(screen.getByLabelText("Adres serwera").props.value).toBe("https://");
  });

  it("shows the server version for the typed address", async () => {
    await renderScreen(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText("Adres serwera"), "silo.test");
    expect(await screen.findByText("Silo · serwer 0.3.0")).toBeOnTheScreen();
  });

  it("explains an invalid server address", async () => {
    await renderScreen(<LoginScreen />);
    const field = screen.getByLabelText("Adres serwera");
    await fireEvent.changeText(field, "ftp://silo.test");
    await fireEvent(field, "blur");
    expect(await screen.findByText(/Wpisz adres serwera/)).toBeOnTheScreen();
  });

  it("shows the Polish message for wrong credentials (401)", async () => {
    server.use(http.post(`${API}/session`, () => problem(401, "invalid_credentials")));
    await fillAndSubmit();
    expect(await screen.findByText("Nieprawidłowy e-mail lub hasło")).toBeOnTheScreen();
    expect(useAuth.getState().status).toBe("signedOut");
  });

  it("tells how long to wait when rate limited (429)", async () => {
    server.use(
      http.post(`${API}/session`, () => problem(429, "rate_limited", { "Retry-After": "42" })),
    );
    await fillAndSubmit();
    expect(await screen.findByText("Za dużo prób, spróbuj za 42 s")).toBeOnTheScreen();
  });

  it("reports an unreachable mail server (502)", async () => {
    server.use(http.post(`${API}/session`, () => problem(502, "upstream_imap_error")));
    await fillAndSubmit();
    expect(await screen.findByText("Serwer poczty niedostępny")).toBeOnTheScreen();
  });

  it("reports a network failure", async () => {
    server.use(http.post(`${API}/session`, () => HttpResponse.error()));
    await fillAndSubmit();
    expect(await screen.findByText("Nie można połączyć z serwerem")).toBeOnTheScreen();
  });

  it("signs in with the normalised address and stores the token", async () => {
    server.use(
      http.post(`${API}/session`, () => HttpResponse.json({ ...sessionBody, token: "tok_new" })),
    );
    await fillAndSubmit();
    await waitFor(() => expect(useAuth.getState().status).toBe("signedIn"));
    expect(useAuth.getState().serverUrl).toBe(SERVER_URL);
    expect(secureStore().get("silo.token")).toBe("tok_new");
  });
});
