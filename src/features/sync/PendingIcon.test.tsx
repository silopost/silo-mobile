import { act, screen } from "@testing-library/react-native";
import { renderScreen } from "../../test/render";
import { PENDING_DELAY_MS, PendingIcon } from "./PendingIcon";

beforeEach(() => jest.useFakeTimers({ doNotFake: [] }));
afterEach(() => jest.useRealTimers());

test("shows the clock only after the write-back waited 3 s", async () => {
  await renderScreen(<PendingIcon pending />);
  expect(screen.queryByTestId("pending-icon")).toBeNull();

  await act(async () => jest.advanceTimersByTime(PENDING_DELAY_MS - 1));
  expect(screen.queryByTestId("pending-icon")).toBeNull();

  await act(async () => jest.advanceTimersByTime(1));
  expect(screen.getByTestId("pending-icon")).toBeOnTheScreen();
  expect(screen.getByLabelText("Oczekuje na zapis na serwerze poczty")).toBeOnTheScreen();
});

test("hides the clock once the thread is written back", async () => {
  const view = await renderScreen(<PendingIcon pending />);
  await act(async () => jest.advanceTimersByTime(PENDING_DELAY_MS));
  expect(screen.getByTestId("pending-icon")).toBeOnTheScreen();

  await view.rerender(<PendingIcon pending={false} />);
  expect(screen.queryByTestId("pending-icon")).toBeNull();
});
