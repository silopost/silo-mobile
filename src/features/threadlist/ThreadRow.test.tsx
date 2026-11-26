import { fireEvent, screen } from "@testing-library/react-native";
import { formatListDate } from "../../lib/format";
import { labels, thread } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { cardShape, ThreadRow } from "./ThreadRow";

const me = { email: "ala@example.com", name: "Ala" };

function renderRow(over: Partial<Parameters<typeof ThreadRow>[0]> = {}) {
  const props = {
    thread: thread({}),
    selected: false,
    first: false,
    last: false,
    selecting: false,
    labels,
    viewLabelId: "INBOX",
    me,
    density: "default" as const,
    onOpen: jest.fn(),
    onToggleSelect: jest.fn(),
    onAction: jest.fn(),
    ...over,
  };
  return { props, view: renderScreen(<ThreadRow {...props} />) };
}

test("an unread row is bold and announced in full", async () => {
  const today = new Date();
  today.setHours(9, 12, 0, 0);
  const th = thread({ unreadCount: 1, hasAttachments: true, lastMessageAt: today.toISOString() });
  await renderRow({ thread: th }).view;

  expect(
    screen.getByRole("button", {
      name: "Nieprzeczytany, Jan Kowalski, Oferta na Q4, o 09:12, załącznik",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("thread-names-t_1")).toHaveStyle({ fontWeight: "700" });
  expect(screen.getByTestId("thread-subject-t_1")).toHaveStyle({ fontWeight: "700" });
});

test("a read row is not bold", async () => {
  await renderRow().view;
  expect(screen.getByTestId("thread-names-t_1")).toHaveStyle({ fontWeight: "400" });
  expect(screen.getByText(formatListDate(thread({}).lastMessageAt))).toBeOnTheScreen();
  expect(screen.getByText("Przesyłam ofertę")).toBeOnTheScreen();
});

test("shows the message count, user label chips but not the view's, and '(bez tematu)'", async () => {
  const th = thread({
    subject: "",
    messageCount: 3,
    labelIds: ["INBOX", "l_1", "l_2", "IMPORTANT"],
  });
  await renderRow({ thread: th, viewLabelId: "l_2" }).view;
  expect(screen.getByText("(bez tematu)")).toBeOnTheScreen();
  expect(screen.getByText(" 3")).toBeOnTheScreen();
  expect(screen.getByText("Praca")).toBeOnTheScreen();
  expect(screen.queryByText("Rachunki")).toBeNull();
  expect(screen.queryByText("IMPORTANT")).toBeNull();
});

test("the compact density hides the snippet", async () => {
  await renderRow({ density: "compact" }).view;
  expect(screen.queryByText("Przesyłam ofertę")).toBeNull();
});

test("tap opens, long press and the avatar select, the star stars", async () => {
  const { props, view } = renderRow();
  await view;
  await fireEvent.press(screen.getByTestId("thread-t_1"));
  expect(props.onOpen).toHaveBeenCalledWith(props.thread);

  await fireEvent(screen.getByTestId("thread-t_1"), "longPress");
  await fireEvent.press(screen.getByRole("checkbox", { name: "Zaznacz wątek" }));
  expect(props.onToggleSelect).toHaveBeenCalledTimes(2);

  await fireEvent.press(screen.getByLabelText("Dodaj gwiazdkę"));
  expect(props.onAction).toHaveBeenCalledWith("star", "t_1");
});

test("in selection mode a tap toggles and a selected row shows the check", async () => {
  const { props, view } = renderRow({ selecting: true, selected: true });
  await view;
  await fireEvent.press(screen.getByTestId("thread-t_1"));
  expect(props.onOpen).not.toHaveBeenCalled();
  expect(props.onToggleSelect).toHaveBeenCalledWith("t_1");
  expect(screen.getByTestId("thread-t_1")).toBeSelected();
  expect(screen.getByRole("checkbox", { name: "Odznacz wątek" })).toBeChecked();
});

test("an unread row has the dot after the date, a read one has not", async () => {
  await renderRow({ thread: thread({ unreadCount: 1 }) }).view;
  expect(screen.getByTestId("thread-unread-dot-t_1")).toBeOnTheScreen();
  screen.unmount();
  await renderRow().view;
  expect(screen.queryByTestId("thread-unread-dot-t_1")).toBeNull();
});

test("a card rounds the group's outer corners by its place; a selected card is fully rounded", () => {
  const corners = (s: object) => s as Record<string, number>;
  expect(corners(cardShape(true, true, false))).toEqual({ borderRadius: 16 });
  expect(corners(cardShape(true, false, false))).toMatchObject({
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 4,
  });
  expect(corners(cardShape(false, true, false))).toMatchObject({
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
  });
  expect(corners(cardShape(false, false, false))).toEqual({ borderRadius: 4 });
  expect(corners(cardShape(false, false, true))).toEqual({ borderRadius: 16 });
  // One static style per shape: rows only pick a reference.
  expect(cardShape(false, false, false)).toBe(cardShape(false, false, false));
});
