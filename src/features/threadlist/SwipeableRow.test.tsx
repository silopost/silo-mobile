import { screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { renderScreen } from "../../test/render";
import { SwipeableRow, swipeLook } from "./SwipeableRow";

// The pan itself is not driven in jest (gesture-handler's jest setup does not run native pans);
// swipeActionFor (actions.test.ts) covers which action a side triggers.

test("renders the row over the backgrounds of its actions", async () => {
  await renderScreen(
    <SwipeableRow left="archive" right="trash" enabled onSwipe={jest.fn()}>
      <Text>Wiersz</Text>
    </SwipeableRow>,
  );
  expect(screen.getByText("Wiersz")).toBeOnTheScreen();
});

test("archive is green and trash red, as in Gmail", () => {
  expect(swipeLook("archive")).toEqual({ color: "#188038", icon: "archive-outline" });
  expect(swipeLook("trash").icon).toBe("delete-outline");
});
