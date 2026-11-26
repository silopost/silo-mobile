import { act, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { forgetSession } from "../../api/cache";
import { deviceLocale, getLocale, type Locale } from "../../lib/i18n";
import { defaultUi, useUi } from "../../state/ui";
import { sessionBody } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, serveMeta, server, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";

// A file of its own: it renders the app twice (before and after the sign-out), which leaves the
// router's global state unfit for further renders in the same file.
setupMsw();

/** A server keeping settings.language with the language of the signed-in user. */
function serveUser(language: Locale) {
  const settings = { ...sessionBody.settings, language };
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json({ ...sessionBody, settings })),
    http.get(`${API}/settings`, () => HttpResponse.json(settings)),
  );
}

beforeEach(() => {
  resetAuth();
  signIn();
  useUi.setState({ ...defaultUi });
  serveMeta("0.6.0");
});

it("follows the signed-in user, and the device after the sign-out", async () => {
  // The users work in the language the device (the machine running the tests) is not in.
  const device = deviceLocale();
  const other = device === "pl" ? "en" : "pl";
  serveUser(other);
  const first = await renderApp("/settings/general");
  await screen.findByTestId("setting-undo-send");
  await waitFor(() => expect(useUi.getState().language).toBe(other));
  expect(getLocale()).toBe(other);

  // Sign-out: the login screen speaks the device language, nothing is remembered.
  await act(() => forgetSession());
  await waitFor(() => expect(getLocale()).toBe(device));
  expect(useUi.getState().language).toBeNull();
  first.unmount();

  // The next user signs in: their language, not the device's.
  serveUser(other);
  signIn();
  await renderApp("/settings/general");
  await screen.findByTestId("setting-undo-send");
  await waitFor(() => expect(getLocale()).toBe(other));
  expect(useUi.getState().language).toBe(other);
});
