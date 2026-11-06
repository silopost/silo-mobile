import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { account, sessionBody } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

setupMsw();

const second = { ...account, id: "acc_2", email: "praca@example.com", position: 1 };

beforeEach(() => {
  resetAuth();
  signIn();
  server.use(http.get(`${API}/labels`, () => HttpResponse.json({ labels: [] })));
});

describe("start route", () => {
  it("opens the Inbox of the first account by position", async () => {
    server.use(
      http.get(`${API}/session`, () =>
        HttpResponse.json({ ...sessionBody, accounts: [second, account] }),
      ),
    );
    const app = await renderApp("/");
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox"));
  });

  it("opens the Inbox of settings.activeAccountId", async () => {
    server.use(
      http.get(`${API}/session`, () =>
        HttpResponse.json({
          ...sessionBody,
          settings: { ...sessionBody.settings, activeAccountId: "acc_2" },
          accounts: [account, second],
        }),
      ),
    );
    const app = await renderApp("/");
    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
  });

  it("says so when the user has no mail account and offers to add one", async () => {
    server.use(
      http.get(`${API}/session`, () => HttpResponse.json({ ...sessionBody, accounts: [] })),
    );
    const app = await renderApp("/");
    expect(await screen.findByText(/Brak kont pocztowych/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Dodaj konto"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/add-account"));
  });
});
