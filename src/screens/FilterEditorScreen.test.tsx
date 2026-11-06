import { act, fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { queryClient } from "../api/cache";
import { applyEvent } from "../api/events";
import type { components } from "../api/schema";
import { useToasts } from "../state/toasts";
import { filter, labels, sessionBody, syncStatus, threadPage } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, serveMeta, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

type Filter = components["schemas"]["Filter"];

setupMsw();

let filters: Filter[];
let posts: Record<string, unknown>[];
let puts: Record<string, unknown>[];
let applied: string[];
let deleted: string[];
let refuse: { code: string } | null;

const problem = (code: string) =>
  HttpResponse.json({ status: 422, code, title: "Unprocessable Entity" }, { status: 422 });

beforeEach(() => {
  resetAuth();
  signIn();
  serveMeta("0.4.0");
  useToasts.setState({ current: null });
  filters = [filter({ name: "Sklep" })];
  posts = [];
  puts = [];
  applied = [];
  deleted = [];
  refuse = null;
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json(syncStatus({}))),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/threads`, () => HttpResponse.json(threadPage([]))),
    http.get(`${API}/search/suggest`, () => HttpResponse.json({ suggestions: [] })),
    http.get(`${API}/filters`, () => HttpResponse.json({ filters })),
    http.post(`${API}/filters`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posts.push(body);
      if (refuse) return problem(refuse.code);
      const created = filter({ ...(body as Partial<Filter>), id: "f_9", position: 1 });
      filters = [...filters, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put(`${API}/filters/:id`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      puts.push(body);
      return HttpResponse.json({ ...filters[0], ...body });
    }),
    http.delete(`${API}/filters/:id`, ({ params }) => {
      deleted.push(String(params.id));
      filters = [];
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${API}/filters/:id/apply`, ({ params }) => {
      applied.push(String(params.id));
      return HttpResponse.json({ jobId: "j_1", matchedEstimate: 7 }, { status: 202 });
    }),
  );
});

async function openNew() {
  const app = await renderApp("/settings/filters?accountId=acc_1");
  await fireEvent.press(await screen.findByTestId("filter-create"));
  await waitFor(() => expect(app.getPathname()).toBe("/settings/filter"));
  return app;
}

describe("filter editor", () => {
  it("creates a filter from the text, the chips and the actions", async () => {
    const app = await openNew();

    await fireEvent.changeText(
      await screen.findByTestId("filter-criteria"),
      "from:jan@example.com",
    );
    await fireEvent.press(screen.getByTestId("search-chip-attachment"));
    expect(screen.getByTestId("filter-criteria").props.value).toBe(
      "from:jan@example.com has:attachment",
    );
    await fireEvent.press(screen.getByRole("switch", { name: "Pomiń Odebrane (archiwizuj)" }));
    await fireEvent.press(screen.getByRole("switch", { name: "Oznacz gwiazdką" }));
    await fireEvent.press(screen.getByTestId("filter-labels"));
    await fireEvent.press(
      within(await screen.findByTestId("filter-labels-sheet")).getByLabelText("Praca"),
    );
    await fireEvent.press(screen.getByText("Zamknij"));
    expect(within(screen.getByTestId("filter-labels")).getByText("Praca")).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("filter-save"));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]).toEqual({
      accountId: "acc_1",
      name: "",
      criteria: "from:jan@example.com has:attachment",
      enabled: true,
      actions: {
        archive: true,
        markRead: false,
        star: true,
        important: false,
        trash: false,
        addLabelIds: ["l_1"],
      },
    });
    await waitFor(() => expect(app.getPathname()).toBe("/settings/filters"));
    expect(useToasts.getState().current?.message).toBe("Zapisano filtr");
    expect(applied).toEqual([]);
  });

  it("explains a filter the server refuses (invalid_filter) and stays open", async () => {
    refuse = { code: "invalid_filter" };
    const app = await openNew();
    await fireEvent.changeText(await screen.findByTestId("filter-criteria"), "in:anywhere");
    await fireEvent.press(screen.getByTestId("filter-save"));

    expect(await screen.findByText(/Serwer odrzucił filtr/)).toBeOnTheScreen();
    expect(app.getPathname()).toBe("/settings/filter");
  });

  it("shows invalid criteria (invalid_query) under the field", async () => {
    refuse = { code: "invalid_query" };
    await openNew();
    await fireEvent.changeText(await screen.findByTestId("filter-criteria"), "from:(");
    await fireEvent.press(screen.getByRole("switch", { name: "Oznacz jako przeczytane" }));
    await fireEvent.press(screen.getByTestId("filter-save"));

    expect(await screen.findByText(/Nieprawidłowe kryteria/)).toBeOnTheScreen();
  });

  it("asks for criteria before sending anything", async () => {
    await openNew();
    await fireEvent.press(await screen.findByTestId("filter-save"));
    expect(await screen.findByText("Wpisz kryteria filtra.")).toBeOnTheScreen();
    expect(posts).toEqual([]);
  });

  it("applies the filter to existing mail and reports filter.applied", async () => {
    await openNew();
    await fireEvent.changeText(await screen.findByTestId("filter-criteria"), "from:sklep");
    await fireEvent.press(screen.getByRole("switch", { name: "Oznacz jako przeczytane" }));
    await fireEvent.press(
      screen.getByRole("switch", { name: "Zastosuj też do istniejących wiadomości" }),
    );
    await fireEvent.press(screen.getByTestId("filter-save"));

    await waitFor(() => expect(applied).toEqual(["f_9"]));
    await waitFor(() =>
      expect(useToasts.getState().current?.message).toBe("Stosowanie filtra… (ok. 7 wątków)"),
    );
    await act(() =>
      applyEvent(queryClient, "filter.applied", {
        filterId: "f_9",
        accountId: "acc_1",
        messages: 9,
        threads: 7,
      }),
    );
    expect(useToasts.getState().current?.message).toBe("Filtr zastosowano do 7 wątków");
  });

  it("edits a filter of the list with a PUT of the whole filter", async () => {
    const app = await renderApp("/settings/filters?accountId=acc_1");
    await fireEvent.press(await screen.findByRole("button", { name: /^Sklep/ }));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/filter"));

    expect((await screen.findByTestId("filter-criteria")).props.value).toBe(
      "from:sklep@example.com",
    );
    await fireEvent.press(screen.getByRole("switch", { name: "Oznacz jako ważne" }));
    await fireEvent.press(screen.getByTestId("filter-save"));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]).toEqual({
      accountId: "acc_1",
      name: "Sklep",
      criteria: "from:sklep@example.com",
      enabled: true,
      position: 0,
      actions: {
        archive: true,
        markRead: false,
        star: false,
        important: true,
        trash: false,
        addLabelIds: ["l_1"],
      },
    });
  });

  it("removes a filter after a confirmation", async () => {
    const app = await renderApp("/settings/filters?accountId=acc_1");
    await fireEvent.press(await screen.findByRole("button", { name: /^Sklep/ }));
    await fireEvent.press(await screen.findByRole("button", { name: "Usuń" }));
    expect(await screen.findByTestId("filter-remove-dialog")).toBeOnTheScreen();
    expect(deleted).toEqual([]);
    await fireEvent.press(screen.getByTestId("filter-remove-confirm"));

    await waitFor(() => expect(deleted).toEqual(["f_1"]));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/filters"));
    expect(useToasts.getState().current?.message).toBe("Usunięto filtr");
  });

  it("tests the criteria in the search", async () => {
    const app = await openNew();
    await fireEvent.changeText(await screen.findByTestId("filter-criteria"), "from:sklep");
    await fireEvent.press(screen.getByText("Testuj wyszukiwanie"));
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/search"));
    expect(app.getSearchParams()).toMatchObject({ q: "from:sklep" });
  });

  it("is opened from the menu of search results with the query as criteria", async () => {
    const app = await renderApp("/u/0/search?q=from%3Asklep%20is%3Aunread");
    await fireEvent.press(await screen.findByRole("button", { name: "Więcej opcji" }));
    await fireEvent.press(await screen.findByText("Utwórz filtr z tego wyszukiwania"));

    await waitFor(() => expect(app.getPathname()).toBe("/settings/filter"));
    expect((await screen.findByTestId("filter-criteria")).props.value).toBe("from:sklep is:unread");
  });

  it("the search menu is not offered by a 0.3.0 server", async () => {
    serveMeta("0.3.0");
    await renderApp("/u/0/search?q=from%3Asklep");
    expect(await screen.findByTestId("search-input")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Więcej opcji" })).toBeNull();
  });
});
