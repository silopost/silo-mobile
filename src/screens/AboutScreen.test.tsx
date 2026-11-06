import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import * as WebBrowser from "expo-web-browser";
import { http, HttpResponse } from "msw";
import { silo, version } from "../../package.json";
import { useAuth } from "../state/auth";
import { sessionBody } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => ({})) }));

setupMsw();

beforeEach(() => {
  resetAuth();
  signIn();
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/meta`, () =>
      HttpResponse.json({
        serverVersion: "0.3.1",
        apiVersion: "1",
        minWebVersion: "0.3.0",
        authMode: "imap",
        allowCustomServers: false,
        maxAttachmentBytes: 26214400,
      }),
    ),
    http.get(`${API}/sessions`, () => HttpResponse.json({ sessions: [] })),
  );
});

describe("about", () => {
  it("opens from settings and shows the app, contract and server versions", async () => {
    const app = await renderApp("/settings");
    await fireEvent.press(await screen.findByTestId("settings-about"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/about"));

    expect(within(await screen.findByTestId("about-app")).getByText(version)).toBeOnTheScreen();
    expect(screen.getByText(`silo-server ${silo.serverRef}`)).toBeOnTheScreen();
    expect(within(screen.getByTestId("about-server")).getByText(SERVER_URL)).toBeOnTheScreen();
    expect(
      await within(screen.getByTestId("about-server-version")).findByText("0.3.1"),
    ).toBeOnTheScreen();
    expect(within(screen.getByTestId("about-api-version")).getByText("1")).toBeOnTheScreen();
    expect(screen.getByText("Hasłem skrzynki pocztowej")).toBeOnTheScreen();
    expect(within(screen.getByTestId("about-attachments")).getByText(/25/)).toBeOnTheScreen();
  });

  it("opens the source and the sessions", async () => {
    const app = await renderApp("/settings/about");

    await fireEvent.press(await screen.findByTestId("about-license"));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      "https://github.com/silopost/silo-mobile",
    );

    await fireEvent.press(screen.getByTestId("about-sessions"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/sessions"));
  });

  it("signs out", async () => {
    server.use(http.delete(`${API}/session`, () => new HttpResponse(null, { status: 204 })));
    await renderApp("/settings/about");
    await fireEvent.press(await screen.findByTestId("about-sign-out"));
    await waitFor(() => expect(useAuth.getState().status).toBe("signedOut"));
  });
});
