import { fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { account, label, labels, sessionBody } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, serveMeta, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";

setupMsw();

const work = {
  ...account,
  id: "acc_2",
  email: "praca@example.com",
  displayName: "Praca",
  position: 2,
};
const home = { ...account, id: "acc_3", email: "dom@example.com", displayName: "", position: 1 };

let labelRequests: string[];

beforeEach(() => {
  resetAuth();
  signIn();
  labelRequests = [];
  server.use(
    http.get(`${API}/session`, () =>
      HttpResponse.json({ ...sessionBody, accounts: [work, account, home] }),
    ),
    http.get(`${API}/labels`, ({ request }) => {
      const id = new URL(request.url).searchParams.get("accountId") ?? "";
      labelRequests.push(id);
      const unread = { acc_1: 12, acc_2: 5, acc_3: 0 }[id] ?? 0;
      return HttpResponse.json({
        labels: id === "acc_1" ? labels : [label({ accountId: id, threadsUnread: unread })],
      });
    }),
  );
});

describe("search bar", () => {
  it("opens the drawer from the menu button", async () => {
    const app = await renderApp("/u/0/inbox");
    const drawerOpen = () => JSON.stringify(app.getRouterState()).includes('"status":"open"');
    expect(drawerOpen()).toBe(false);
    await fireEvent.press(await screen.findByRole("button", { name: "Otwórz menu nawigacji" }));
    await waitFor(() => expect(drawerOpen()).toBe(true));
  });

  it("opens the search", async () => {
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByRole("search", { name: "Szukaj w poczcie" }));
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/search"));
  });

  it("names the section above the list outside the Inbox", async () => {
    await renderApp("/u/0/starred");
    expect(await screen.findByRole("header", { name: "Oznaczone gwiazdką" })).toBeOnTheScreen();
  });
});

describe("compose FAB", () => {
  it("opens the full-screen compose", async () => {
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByRole("button", { name: "Utwórz" }));
    await waitFor(() => expect(app.getPathname()).toBe("/compose"));
  });
});

describe("account switcher", () => {
  it("lists the other accounts by position with their unread Inbox counters", async () => {
    await renderApp("/u/0/inbox");
    await screen.findByRole("button", { name: "Odebrane, 12 nieprzeczytanych" });
    // Counters of other accounts are fetched only once the switcher opens.
    expect(labelRequests).toEqual(["acc_1"]);

    await fireEvent.press(screen.getByRole("button", { name: /^Konto ala@example.com/ }));

    expect(
      await screen.findByRole("button", {
        name: "Przełącz na praca@example.com, 5 nieprzeczytanych",
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^account-\d$/).map((el) => el.props.testID)).toEqual([
      "account-1",
      "account-2",
    ]);
    expect(screen.getByRole("button", { name: "Przełącz na dom@example.com" })).toBeOnTheScreen();
    expect(labelRequests).toEqual(expect.arrayContaining(["acc_2", "acc_3"]));
    expect(screen.getByRole("button", { name: "Dodaj konto" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Wyloguj się" })).toBeOnTheScreen();
  });

  it("switches to the Inbox of the chosen account", async () => {
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByRole("button", { name: /^Konto ala@example.com/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Przełącz na dom@/ }));

    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
    expect(await screen.findByRole("button", { name: /^Konto dom@example.com/ })).toBeOnTheScreen();
  });
});

describe("account switcher on server 0.4.0", () => {
  it("stores the chosen account as settings.activeAccountId", async () => {
    serveMeta("0.4.0");
    const patches: unknown[] = [];
    server.use(
      http.get(`${API}/settings`, () => HttpResponse.json(sessionBody.settings)),
      http.patch(`${API}/settings`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patches.push(body);
        return HttpResponse.json({
          ...sessionBody.settings,
          ...body,
          updatedAt: "2026-11-06T10:00:00Z",
        });
      }),
    );
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByRole("button", { name: /^Konto ala@example.com/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Przełącz na dom@/ }));

    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
    await waitFor(() => expect(patches).toEqual([{ activeAccountId: "acc_3" }]));
  });

  it("sends nothing to a 0.3.0 server", async () => {
    let patched = false;
    server.use(
      http.patch(`${API}/settings`, () => {
        patched = true;
        return HttpResponse.json(sessionBody.settings);
      }),
    );
    const app = await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByRole("button", { name: /^Konto ala@example.com/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Przełącz na dom@/ }));
    await waitFor(() => expect(app.getPathname()).toBe("/u/1/inbox"));
    expect(patched).toBe(false);
  });
});
