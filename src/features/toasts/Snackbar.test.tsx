import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderScreen } from "../../test/render";
import { hideToast, show, toast, useToasts } from "../../state/toasts";
import { Snackbar } from "./Snackbar";

afterEach(() => hideToast());

test("shows the current toast and its action", async () => {
  const onPress = jest.fn();
  await renderScreen(<Snackbar />);

  await act(async () => show({ message: "Zarchiwizowano", action: { label: "Cofnij", onPress } }));
  expect(screen.getByText("Zarchiwizowano")).toBeOnTheScreen();

  await fireEvent.press(screen.getByText("Cofnij"));
  expect(onPress).toHaveBeenCalled();
});

test("a newer toast replaces the shown one", async () => {
  await renderScreen(<Snackbar />);
  await act(async () => toast("Pierwszy"));
  await act(async () => toast("Drugi"));
  expect(screen.getByText("Drugi")).toBeOnTheScreen();
  expect(screen.queryByText("Pierwszy")).toBeNull();
  expect(useToasts.getState().current?.message).toBe("Drugi");
});
