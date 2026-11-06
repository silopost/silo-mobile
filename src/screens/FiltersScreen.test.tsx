import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { filter, labels, sessionBody, syncStatus } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, serveMeta, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

type Filter = components["schemas"]["Filter"];

setupMsw();

let filters: Filter[];
let puts: { id: string; body: Record<string, unknown> }[];

beforeEach(() => {
  resetAuth();
  signIn();
  serveMeta("0.4.0");
  filters = [
    filter({}),
    filter({
      id: "f_2",
      name: "Faktury",
      criteria: "subject:faktura has:attachment",
      position: 1,
      enabled: false,
      actions: { ...filter({}).actions, archive: false, star: true, addLabelIds: [] },
    }),
  ];
  puts = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json(syncStatus({}))),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/filters`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("accountId")).toBe("acc_1");
      return HttpResponse.json({ filters });
    }),
    http.put(`${API}/filters/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      puts.push({ id: String(params.id), body });
      const f = filters.find((x) => x.id === params.id)!;
      const saved = { ...f, ...body } as Filter;
      filters = filters.map((x) => (x.id === f.id ? saved : x));
      return HttpResponse.json(saved);
    }),
  );
});

describe("filters list", () => {
  it("is offered in the account settings of a 0.4.0 server", async () => {
    const app = await renderApp("/settings/account/acc_1");
    await fireEvent.press(await screen.findByTestId("account-filters"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/filters"));
    expect(await screen.findByTestId("filter-f_1")).toBeOnTheScreen();
  });

  it("is not offered by a 0.3.0 server", async () => {
    serveMeta("0.3.0");
    await renderApp("/settings/account/acc_1");
    expect(await screen.findByTestId("account-name")).toBeOnTheScreen();
    expect(screen.queryByTestId("account-filters")).toBeNull();
  });

  it("shows the criteria, the name and the actions as chips", async () => {
    await renderApp("/settings/filters?accountId=acc_1");

    const first = await screen.findByTestId("filter-f_1");
    expect(within(first).getByText("from:sklep@example.com")).toBeOnTheScreen();
    expect(within(first).getByText("Pomiń Odebrane (archiwizuj)")).toBeOnTheScreen();
    expect(within(first).getByText("Etykieta: Praca")).toBeOnTheScreen();
    const second = screen.getByTestId("filter-f_2");
    expect(within(second).getByText("Faktury")).toBeOnTheScreen();
    expect(within(second).getByText("Oznacz gwiazdką")).toBeOnTheScreen();
    expect(within(second).getByText("Wyłączony")).toBeOnTheScreen();
  });

  it("enables a filter with a PUT of the whole filter", async () => {
    await renderApp("/settings/filters?accountId=acc_1");

    const toggle = await screen.findByRole("switch", { name: "Włącz filtr Faktury" });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toEqual({
      id: "f_2",
      body: {
        accountId: "acc_1",
        name: "Faktury",
        criteria: "subject:faktura has:attachment",
        enabled: true,
        position: 1,
        actions: {
          archive: false,
          markRead: false,
          star: true,
          important: false,
          trash: false,
          addLabelIds: [],
        },
      },
    });
    await waitFor(() =>
      expect(within(screen.getByTestId("filter-f_2")).queryByText("Wyłączony")).toBeNull(),
    );
  });

  it("moves a filter down with a PUT of its new position", async () => {
    await renderApp("/settings/filters?accountId=acc_1");

    expect(
      await screen.findByRole("button", { name: "Przesuń w górę: from:sklep@example.com" }),
    ).toBeDisabled();
    await fireEvent.press(
      screen.getByRole("button", { name: "Przesuń w dół: from:sklep@example.com" }),
    );
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]?.id).toBe("f_1");
    expect(puts[0]?.body).toMatchObject({ position: 1, criteria: "from:sklep@example.com" });
  });
});
