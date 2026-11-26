import { fireEvent, screen, waitFor, within } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { getLocale } from "../../lib/i18n";
import { defaultUi, useUi } from "../../state/ui";
import { sessionBody } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, serveMeta, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";

setupMsw();

type Settings = typeof sessionBody.settings;

let patches: Record<string, unknown>[];
let current: Settings;
let refuse: boolean;

/** A server keeping settings.language: GET /session and /settings, PATCH /settings. */
function serveSettings(language: Settings["language"]) {
  current = { ...sessionBody.settings, language };
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json({ ...sessionBody, settings: current })),
    http.get(`${API}/settings`, () => HttpResponse.json(current)),
    http.patch(`${API}/settings`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      patches.push(body);
      if (refuse)
        return HttpResponse.json(
          { status: 422, code: "invalid_setting", title: "Unprocessable Entity" },
          { status: 422 },
        );
      current = { ...current, ...body } as Settings;
      return HttpResponse.json(current);
    }),
  );
}

beforeEach(() => {
  resetAuth();
  signIn();
  useUi.setState({ ...defaultUi });
  patches = [];
  refuse = false;
});

describe("a server with settings.language (0.6.0)", () => {
  beforeEach(() => serveMeta("0.6.0"));

  it("switches to the user's language after the sign-in and remembers it", async () => {
    serveSettings("en");
    await renderApp("/settings/general");

    expect(await screen.findByText("Silo account (synced)")).toBeOnTheScreen();
    expect(getLocale()).toBe("en");
    expect(useUi.getState().language).toBe("en");
    expect(within(screen.getByTestId("setting-language")).getByText("English")).toBeOnTheScreen();
  });

  it("changes the language on the server and the whole screen at once", async () => {
    serveSettings("en");
    await renderApp("/settings/general");
    // The screen comes back in English once the session is read.
    await screen.findByText("Silo account (synced)");

    await fireEvent.press(screen.getByTestId("setting-language"));
    await fireEvent.press(await screen.findByTestId("choice-pl"));

    await waitFor(() => expect(patches).toEqual([{ language: "pl" }]));
    expect(await screen.findByText("Konto Silo (synchronizowane)")).toBeOnTheScreen();
    expect(within(screen.getByTestId("setting-language")).getByText("Polski")).toBeOnTheScreen();
    expect(useUi.getState().language).toBe("pl");
  });

  it("puts the previous language back with a message when the server refuses it", async () => {
    serveSettings("en");
    refuse = true;
    await renderApp("/settings/general");
    // The screen comes back in English once the session is read.
    await screen.findByText("Silo account (synced)");

    await fireEvent.press(screen.getByTestId("setting-language"));
    await fireEvent.press(await screen.findByTestId("choice-pl"));

    await waitFor(() => expect(patches).toEqual([{ language: "pl" }]));
    expect(await screen.findByText("The server rejected this value.")).toBeOnTheScreen();
    expect(getLocale()).toBe("en");
    expect(within(screen.getByTestId("setting-language")).getByText("English")).toBeOnTheScreen();
  });
});

describe("an older server (0.4.0) without settings.language", () => {
  beforeEach(() => {
    serveMeta("0.4.0");
    // A stray value from a newer server is not applied by an old one's feature check.
    serveSettings("en");
  });

  it("keeps the language choice on this device only", async () => {
    await renderApp("/settings/general");

    const item = await screen.findByTestId("setting-language");
    expect(getLocale()).toBe("pl");
    expect(within(item).getByText("Polski")).toBeOnTheScreen();
    await fireEvent.press(item);
    await fireEvent.press(await screen.findByTestId("choice-en"));

    expect(await screen.findByText("Silo account (synced)")).toBeOnTheScreen();
    expect(within(screen.getByTestId("setting-language")).getByText("English")).toBeOnTheScreen();
    expect(useUi.getState().language).toBe("en");
    expect(patches).toEqual([]);
  });
});
