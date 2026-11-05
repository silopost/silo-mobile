import { fireEvent, screen } from "@testing-library/react-native";
import { renderScreen } from "../../test/render";
import { ComposeFab } from "./ComposeFab";

describe("ComposeFab", () => {
  it("shows the pencil with 'Utwórz' and reports presses", async () => {
    const onPress = jest.fn();
    await renderScreen(<ComposeFab onPress={onPress} />);

    // AnimatedFAB renders the label twice (one copy measures its width).
    expect(screen.getAllByText("Utwórz").length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("button", { name: "Utwórz" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps its accessible name when collapsed to the icon", async () => {
    await renderScreen(<ComposeFab onPress={() => {}} extended={false} />);
    expect(screen.getByRole("button", { name: "Utwórz" })).toBeOnTheScreen();
  });
});
