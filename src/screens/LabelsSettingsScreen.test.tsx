import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { label, labels as baseLabels, sessionBody, syncStatus } from "../test/fixtures";
import { renderApp, signIn } from "../test/router";
import { API, serveMeta, server, setupMsw } from "../test/server";
import { resetAuth } from "../test/utils";

type Label = components["schemas"]["Label"];

setupMsw();

let labels: Label[];
let patches: { id: string; body: Record<string, unknown> }[];
let deleted: string[];
let posts: Record<string, unknown>[];

beforeEach(() => {
  resetAuth();
  signIn();
  serveMeta("0.4.0");
  labels = [
    ...baseLabels.map((l) => (l.type === "user" ? { ...l, keywordState: "mirrored" as const } : l)),
    label({
      id: "l_4",
      name: "Klienci",
      type: "user",
      parentId: "l_1",
      keywordState: "local_only",
    }),
    label({
      id: "l_5",
      name: "Stare",
      type: "user",
      position: 3,
      keywordState: "partial",
      localOnlyFolders: ["f_7"],
    }),
    label({ id: "f_7", name: "Archiwum 2019", type: "folder", folderId: "f_7" }),
  ];
  patches = [];
  deleted = [];
  posts = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json(syncStatus({}))),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/threads`, () =>
      HttpResponse.json({ threads: [], nextCursor: null, resultSizeEstimate: 0 }),
    ),
    http.patch(`${API}/labels/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      patches.push({ id: String(params.id), body });
      if (body.parentId === "l_2")
        return HttpResponse.json(
          { status: 422, code: "invalid_parent", title: "Unprocessable Entity" },
          { status: 422 },
        );
      labels = labels.map((l) => (l.id === params.id ? ({ ...l, ...body } as Label) : l));
      return HttpResponse.json(labels.find((l) => l.id === params.id));
    }),
    http.delete(`${API}/labels/:id`, ({ params }) => {
      deleted.push(String(params.id));
      labels = labels.filter((l) => l.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${API}/labels`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posts.push(body);
      return HttpResponse.json(label({ id: "l_9", type: "user", name: String(body.name) }));
    }),
  );
});

const open = () => renderApp("/settings/labels?accountId=acc_1");

describe("labels settings", () => {
  it("is offered in the account settings of a 0.4.0 server only", async () => {
    const app = await renderApp("/settings/account/acc_1");
    await fireEvent.press(await screen.findByTestId("account-labels"));
    await waitFor(() => expect(app.getPathname()).toBe("/settings/labels"));
  });

  it("is not offered by a 0.3.0 server", async () => {
    serveMeta("0.3.0");
    await renderApp("/settings/account/acc_1");
    expect(await screen.findByTestId("account-name")).toBeOnTheScreen();
    expect(screen.queryByTestId("account-labels")).toBeNull();
  });

  it("lists user labels as a tree with counters and keyword warnings", async () => {
    await open();

    const praca = await screen.findByTestId("label-row-l_1");
    expect(within(praca).getByText("3 nieprzeczytane · 0 wątków")).toBeOnTheScreen();
    expect(screen.queryByTestId("label-warning-l_1")).toBeNull();
    expect(
      within(screen.getByTestId("label-warning-l_4")).getByText(
        "Tylko lokalnie – serwer poczty nie obsługuje słów kluczowych",
      ),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("label-warning-l_5")).getByText(
        "Tylko lokalnie w folderach: Archiwum 2019",
      ),
    ).toBeOnTheScreen();
    // Klienci sits under Praca.
    const ids = screen
      .getAllByTestId(/^label-row-/)
      .map((e) => (e.props as { testID: string }).testID);
    expect(ids.slice(0, 2)).toEqual(["label-row-l_1", "label-row-l_4"]);
    expect(screen.queryByTestId("label-row-f_7")).toBeNull();
  });

  it("hides a label in the drawer with PATCH showInList", async () => {
    await open();
    const toggle = await screen.findByRole("switch", {
      name: "Pokaż w menu nawigacji: Rachunki",
    });
    expect(toggle).toBeChecked();
    await fireEvent.press(toggle);
    await waitFor(() => expect(patches).toEqual([{ id: "l_2", body: { showInList: "hide" } }]));
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "Pokaż w menu nawigacji: Rachunki" }),
      ).not.toBeChecked(),
    );
  });

  it("renames and recolours a label in one PATCH of the changed fields", async () => {
    await open();
    await fireEvent.press(await screen.findByRole("button", { name: "Rachunki" }));
    const dialog = await screen.findByTestId("edit-label-dialog");
    await fireEvent.changeText(within(dialog).getByLabelText("Nazwa etykiety"), "Opłaty");
    await fireEvent.press(within(dialog).getByTestId("label-color-#4a86e8"));
    await fireEvent.press(within(dialog).getByTestId("edit-label-dialog-submit"));

    await waitFor(() =>
      expect(patches).toEqual([
        { id: "l_2", body: { name: "Opłaty", colorBg: "#4a86e8", colorText: "#ffffff" } },
      ]),
    );
    await waitFor(() => expect(screen.queryByTestId("edit-label-dialog")).toBeNull());
    expect(await screen.findByRole("button", { name: "Opłaty" })).toBeOnTheScreen();
  });

  it("clears a colour with empty strings", async () => {
    await open();
    await fireEvent.press(await screen.findByRole("button", { name: "Praca" }));
    const dialog = await screen.findByTestId("edit-label-dialog");
    await fireEvent.press(within(dialog).getByRole("radio", { name: "Bez koloru" }));
    await fireEvent.press(within(dialog).getByTestId("edit-label-dialog-submit"));
    await waitFor(() =>
      expect(patches).toEqual([{ id: "l_1", body: { colorBg: "", colorText: "" } }]),
    );
  });

  it("explains a refused parent and keeps the dialog open", async () => {
    await open();
    await fireEvent.press(await screen.findByRole("button", { name: "Praca" }));
    const dialog = await screen.findByTestId("edit-label-dialog");
    await fireEvent.press(within(dialog).getByTestId("label-parent"));
    // Praca's own child cannot be its parent.
    expect(within(dialog).queryByTestId("label-parent-l_4")).toBeNull();
    await fireEvent.press(within(dialog).getByTestId("label-parent-l_2"));
    await fireEvent.press(within(dialog).getByTestId("edit-label-dialog-submit"));

    await waitFor(() => expect(patches).toEqual([{ id: "l_1", body: { parentId: "l_2" } }]));
    expect(
      await within(screen.getByTestId("edit-label-dialog")).findByText(
        "Etykiety nie można umieścić pod nią samą ani pod jej podetykietą.",
      ),
    ).toBeOnTheScreen();
  });

  it("deletes a label after a confirmation", async () => {
    await open();
    await fireEvent.press(await screen.findByRole("button", { name: "Rachunki" }));
    await fireEvent.press(await screen.findByTestId("edit-label-dialog-delete"));
    expect(await screen.findByTestId("delete-label-dialog")).toBeOnTheScreen();
    expect(screen.getByText(/słowo kluczowe z wiadomości na serwerze/)).toBeOnTheScreen();
    expect(deleted).toEqual([]);
    await fireEvent.press(screen.getByTestId("delete-label-confirm"));

    await waitFor(() => expect(deleted).toEqual(["l_2"]));
    await waitFor(() => expect(screen.queryByTestId("label-row-l_2")).toBeNull());
  });

  it("creates a label with a colour and a parent", async () => {
    await open();
    await fireEvent.press(await screen.findByRole("button", { name: "Nowa etykieta" }));
    const dialog = await screen.findByTestId("create-label-dialog");
    await fireEvent.changeText(within(dialog).getByLabelText("Nazwa etykiety"), "Umowy");
    await fireEvent.press(within(dialog).getByTestId("label-color-#16a766"));
    await fireEvent.press(within(dialog).getByTestId("label-parent"));
    await fireEvent.press(within(dialog).getByTestId("label-parent-l_1"));
    await fireEvent.press(within(dialog).getByTestId("create-label-dialog-submit"));

    await waitFor(() =>
      expect(posts).toEqual([
        {
          accountId: "acc_1",
          type: "user",
          name: "Umowy",
          colorBg: "#16a766",
          colorText: "#ffffff",
          parentId: "l_1",
        },
      ]),
    );
  });
});
