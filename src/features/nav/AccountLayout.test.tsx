import { fireEvent, screen, waitFor } from "expo-router/testing-library";
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
