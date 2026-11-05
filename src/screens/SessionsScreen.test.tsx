import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { useAuth } from "../state/auth";
import { renderScreen } from "../test/render";
import { API, SERVER_URL, server, setupMsw } from "../test/server";
import { resetAuth, secureStore } from "../test/utils";
import { SessionsScreen } from "./SessionsScreen";

type SessionInfo = components["schemas"]["SessionInfo"];

setupMsw();

const base = {
  createdAt: "2026-11-01T10:00:00Z",
  lastSeenAt: "2026-11-05T09:30:00Z",
  expiresAt: "2027-02-03T09:30:00Z",
  ip: "192.0.2.1",
};

const phone: SessionInfo = {
  ...base,
  id: "s_1",
  kind: "bearer",
  clientName: "Pixel 8",
  userAgent: "okhttp",
  current: true,
};
const browser: SessionInfo = {
  ...base,
  id: "s_2",
  kind: "cookie",
  clientName: "",
  userAgent: "Firefox on Linux",
  current: false,
};

let sessions: SessionInfo[];

beforeEach(() => {
  resetAuth();
  secureStore().set("silo.token", "tok_1");
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
  sessions = [phone, browser];
  server.use(http.get(`${API}/sessions`, () => HttpResponse.json({ sessions })));
});

describe("SessionsScreen", () => {
  it("lists the sessions and marks this device", async () => {
    await renderScreen(<SessionsScreen />);

    const current = await screen.findByTestId("session-s_1");
    expect(within(current).getByText("Pixel 8")).toBeOnTheScreen();
    expect(within(current).getByText(/Aplikacja · To urządzenie/)).toBeOnTheScreen();
    expect(within(current).queryByRole("button", { name: /Wyloguj/ })).toBeNull();

    const other = screen.getByTestId("session-s_2");
    expect(within(other).getByText("Firefox on Linux")).toBeOnTheScreen();
    expect(within(other).getByText(/Przeglądarka/)).toBeOnTheScreen();
    expect(within(other).getByText(/Ostatnia aktywność:/)).toBeOnTheScreen();
  });

  it("revokes another session after confirmation", async () => {
    const revoked: string[] = [];
    server.use(
      http.delete(`${API}/sessions/:id`, ({ params }) => {
        revoked.push(String(params.id));
        sessions = sessions.filter((s) => s.id !== params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderScreen(<SessionsScreen />);

    await fireEvent.press(await screen.findByRole("button", { name: "Wyloguj Firefox on Linux" }));
    expect(await screen.findByText("Wylogować urządzenie?")).toBeOnTheScreen();
    expect(revoked).toEqual([]);
    await fireEvent.press(screen.getByTestId("confirm-revoke"));

    await waitFor(() => expect(screen.queryByTestId("session-s_2")).toBeNull());
    expect(revoked).toEqual(["s_2"]);
  });

  it("signs out of this device", async () => {
    server.use(http.delete(`${API}/session`, () => new HttpResponse(null, { status: 204 })));
    await renderScreen(<SessionsScreen />);

    await fireEvent.press(await screen.findByRole("button", { name: "Wyloguj się" }));

    await waitFor(() => expect(useAuth.getState().status).toBe("signedOut"));
    expect(secureStore().has("silo.token")).toBe(false);
  });
});
