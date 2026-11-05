import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { labels, sessionBody } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";

setupMsw();

let labelRequests: (string | null)[];

beforeEach(() => {
  resetAuth();
  signIn();
  labelRequests = [];
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/labels`, ({ request }) => {
      labelRequests.push(new URL(request.url).searchParams.get("accountId"));
      return HttpResponse.json({ labels });
    }),
  );
});

describe("account drawer", () => {
  it("shows the counters of GET /labels of the route's account", async () => {
    await renderApp("/u/0/inbox");

    expect(
      await screen.findByRole("button", { name: "Odebrane, 12 nieprzeczytanych" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Praca, 3 nieprzeczytane" })).toBeOnTheScreen();
    expect(screen.getByTestId("nav-inbox")).toBeSelected();
    expect(labelRequests).toContain("acc_1");
  });

  it("'Utwórz nową' creates a label with POST /labels and refetches the labels", async () => {
    const created: unknown[] = [];
    server.use(
      http.post(`${API}/labels`, async ({ request }) => {
        created.push(await request.json());
        return HttpResponse.json(labels[5], { status: 201 });
      }),
    );
    await renderApp("/u/0/inbox");
    await fireEvent.press(await screen.findByRole("button", { name: "Utwórz nową" }));
    await fireEvent.changeText(await screen.findByLabelText("Nazwa etykiety"), "Nowa");
    const before = labelRequests.length;
    await fireEvent.press(within(screen.getByTestId("create-label-dialog")).getByText("Utwórz"));

    await waitFor(() => expect(screen.queryByTestId("create-label-dialog")).toBeNull());
    expect(created).toEqual([{ accountId: "acc_1", name: "Nowa", type: "user" }]);
    await waitFor(() => expect(labelRequests.length).toBeGreaterThan(before));
  });

  it("opens the chosen label", async () => {
    const app = await renderApp("/u/0/inbox");

    await fireEvent.press(await screen.findByRole("button", { name: "Oznaczone gwiazdką" }));

    await waitFor(() => expect(app.getPathname()).toBe("/u/0/starred"));
    await waitFor(() => expect(screen.getByTestId("nav-starred")).toBeSelected());
    expect(screen.getByTestId("nav-inbox")).not.toBeSelected();
  });

  it("sends an unknown account index back to the active account", async () => {
    const app = await renderApp("/u/7/inbox");
    await waitFor(() => expect(app.getPathname()).toBe("/u/0/inbox"));
  });
});
