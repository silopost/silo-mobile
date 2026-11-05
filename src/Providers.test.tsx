import { act, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { darkTheme, lightTheme, useAppTheme } from "./lib/theme";
import { setTheme, useUi, defaultUi } from "./state/ui";
import { renderScreen } from "./test/render";

function Probe() {
  const theme = useAppTheme();
  return <Text testID="probe">{theme.dark ? "dark" : "light"}</Text>;
}

beforeEach(() => useUi.setState({ ...defaultUi }));

describe("theme", () => {
  it("follows the theme preference of the UI state", async () => {
    await renderScreen(<Probe />);
    // jest's colour scheme is light, so "system" is light.
    expect(screen.getByTestId("probe")).toHaveTextContent("light");

    await act(async () => setTheme("dark"));
    expect(screen.getByTestId("probe")).toHaveTextContent("dark");

    await act(async () => setTheme("light"));
    expect(screen.getByTestId("probe")).toHaveTextContent("light");
  });

  it("uses Gmail's list background in both palettes", () => {
    expect(lightTheme.colors.background).toBe("#ffffff");
    expect(darkTheme.colors.background).toBe("#131314");
  });

  it("persists the preferences in AsyncStorage", async () => {
    await act(async () => setTheme("dark"));
    const AsyncStorage = jest.requireMock("@react-native-async-storage/async-storage") as {
      getItem: (k: string) => Promise<string | null>;
    };
    const stored = JSON.parse((await AsyncStorage.getItem("silo.ui")) ?? "{}");
    expect(stored.state).toMatchObject({ theme: "dark", swipeLeftAction: "archive" });
  });
});
