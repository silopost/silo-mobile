import { screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { darkTheme, lightTheme } from "../../lib/theme";
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

test("archive is dark green with the tray and arrow, trash red, in the theme's colours", () => {
  expect(swipeLook("archive", lightTheme.colors)).toEqual({
    color: lightTheme.colors.swipeArchive,
    icon: "archive-arrow-down-outline",
  });
  expect(swipeLook("trash", lightTheme.colors).icon).toBe("delete-outline");
  expect(swipeLook("trash", darkTheme.colors).color).toBe(darkTheme.colors.swipeTrash);
});
