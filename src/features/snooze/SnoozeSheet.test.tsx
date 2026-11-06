import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { act, fireEvent, screen, waitFor } from "expo-router/testing-library";
import { http, HttpResponse } from "msw";
import { formatWhen } from "../../lib/format";
import { hideToast, useToasts } from "../../state/toasts";
import { labels, sessionBody, thread, threadPage } from "../../test/fixtures";
import { renderApp, signIn } from "../../test/router";
import { API, server, serveMeta, setupMsw } from "../../test/server";
import { resetAuth } from "../../test/utils";

setupMsw();

const TOMORROW = "2026-11-07T07:00:00Z";
const open = DateTimePickerAndroid.open as jest.Mock;

let snoozes: { id: string; until: string }[];
let undos: string[];
let unsnoozes: string[];
/** The Inbox as the server has it (the snooze takes t_1 out, the undo brings it back). */
let inbox: ReturnType<typeof thread>[];

beforeEach(() => {
  resetAuth();
  signIn();
  hideToast();
  open.mockReset();
  snoozes = [];
  undos = [];
  unsnoozes = [];
  inbox = [thread({ id: "t_1" })];
  serveMeta("0.4.0");
  server.use(
    http.get(`${API}/session`, () => HttpResponse.json(sessionBody)),
    http.get(`${API}/labels`, () => HttpResponse.json({ labels })),
    http.get(`${API}/accounts/:id/sync-status`, () => HttpResponse.json({}, { status: 404 })),
    http.get(`${API}/threads`, ({ request }) => {
      const labelId = new URL(request.url).searchParams.get("labelId");
      if (labelId === "SNOOZED")
        return HttpResponse.json(
          threadPage([thread({ id: "t_5", labelIds: ["SNOOZED"], snoozedUntil: TOMORROW })]),
        );
      return HttpResponse.json(threadPage(inbox));
    }),
    http.get(`${API}/snooze/presets`, () =>
      HttpResponse.json({
        timezone: "Europe/Warsaw",
        presets: [
          { key: "later_today", label: "Later today", until: "2026-11-06T17:00:00Z" },
          { key: "tomorrow", label: "Tomorrow", until: TOMORROW },
          { key: "next_week", label: "Next week", until: "2026-11-09T07:00:00Z" },
        ],
      }),
    ),
    http.post(`${API}/threads/:id/snooze`, async ({ params, request }) => {
      const { until } = (await request.json()) as { until: string };
      snoozes.push({ id: params.id as string, until });
      inbox = [];
      return HttpResponse.json({
        thread: thread({ id: params.id as string, labelIds: ["SNOOZED"], snoozedUntil: until }),
        operationId: "op_9",
        undoUntil: new Date(Date.now() + 10_000).toISOString(),
      });
    }),
    http.post(`${API}/operations/:id/undo`, ({ params }) => {
      undos.push(params.id as string);
      inbox = [thread({ id: "t_1" })];
      return HttpResponse.json({ threads: [thread({ id: "t_1" })], operationId: null });
    }),
    http.delete(`${API}/threads/:id/snooze`, ({ params }) => {
      unsnoozes.push(params.id as string);
      return HttpResponse.json({
        thread: thread({ id: params.id as string }),
        operationId: null,
        undoUntil: null,
      });
    }),
  );
});

/** Selects t_1 in the Inbox and opens "Odłóż do…" from the selection bar. */
async function openSheet() {
  await renderApp("/u/0/inbox");
  await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");
  await fireEvent.press(await screen.findByLabelText("Odłóż"));
  return screen.findByTestId("snooze-sheet");
}

describe("SnoozeSheet", () => {
  it("lists the server's presets in Polish with their times", async () => {
    await openSheet();
    expect(await screen.findByText("Dziś później")).toBeOnTheScreen();
    expect(screen.getByText("Jutro")).toBeOnTheScreen();
    expect(screen.getByText("W przyszłym tygodniu")).toBeOnTheScreen();
    expect(screen.queryByText("Tomorrow")).toBeNull();
    expect(screen.getByText(formatWhen(TOMORROW, { timeZone: "Europe/Warsaw" }))).toBeOnTheScreen();
    expect(screen.getByText("Wybierz datę i godzinę")).toBeOnTheScreen();
  });

  it("snoozes with the preset's time and undoes with Cofnij", async () => {
    await openSheet();
    await fireEvent.press(await screen.findByTestId("snooze-tomorrow"));

    await waitFor(() => expect(snoozes).toEqual([{ id: "t_1", until: TOMORROW }]));
    await waitFor(() =>
      expect(useToasts.getState().current?.message).toBe(`Odłożono do ${formatWhen(TOMORROW)}`),
    );
    expect(screen.queryByTestId("thread-t_1")).toBeNull();

    await fireEvent.press(await screen.findByText("Cofnij"));
    await waitFor(() => expect(undos).toEqual(["op_9"]));
  });

  it("snoozes until the date and time picked in the native dialogs", async () => {
    const picked = [new Date(2026, 10, 20, 0, 0), new Date(2026, 10, 20, 9, 30)];
    open.mockImplementation(({ onValueChange }) => onValueChange({}, picked.shift()));
    await openSheet();
    await fireEvent.press(await screen.findByTestId("snooze-custom"));

    await waitFor(() =>
      expect(snoozes).toEqual([{ id: "t_1", until: new Date(2026, 10, 20, 9, 30).toISOString() }]),
    );
    expect(open.mock.calls.map(([args]) => args.mode)).toEqual(["date", "time"]);
  });

  it("says why when the server refuses (409 not_in_inbox)", async () => {
    server.use(
      http.post(`${API}/threads/:id/snooze`, () =>
        HttpResponse.json({ code: "not_in_inbox", status: 409 }, { status: 409 }),
      ),
    );
    await openSheet();
    await fireEvent.press(await screen.findByTestId("snooze-tomorrow"));
    await waitFor(() =>
      expect(useToasts.getState().current?.message).toBe("Odłożyć można tylko wątki z Odebranych."),
    );
    // Rolled back: the row is in the Inbox again.
    expect(await screen.findByTestId("thread-t_1")).toBeOnTheScreen();
  });

  it("Odłożone shows the wake time in the row and cancels the snooze", async () => {
    await renderApp("/u/0/snoozed");
    expect(await screen.findByTestId("thread-date-t_5")).toHaveTextContent(
      `Odłożono do ${formatWhen(TOMORROW)}`,
    );
    await fireEvent(screen.getByTestId("thread-t_5"), "longPress");
    await fireEvent.press(await screen.findByLabelText("Anuluj odłożenie"));
    await waitFor(() => expect(unsnoozes).toEqual(["t_5"]));
    await waitFor(() =>
      expect(useToasts.getState().current?.message).toBe("Wątek wrócił do Odebranych"),
    );
    expect(useToasts.getState().current?.action).toBeUndefined();
  });

  it("is not offered by a 0.3.0 server", async () => {
    serveMeta("0.3.0");
    await renderApp("/u/0/inbox");
    await fireEvent(await screen.findByTestId("thread-t_1"), "longPress");
    await screen.findByTestId("selection-bar");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByLabelText("Odłóż")).toBeNull();
  });
});
