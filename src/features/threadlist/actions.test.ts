import { act } from "@testing-library/react-native";
import { useSelection } from "../../state/selection";
import { swipeActionFor } from "./actions";

describe("swipeActionFor", () => {
  const ui = { swipeLeftAction: "archive", swipeRightAction: "trash" } as const;

  it("maps each side to its preference", () => {
    expect(swipeActionFor("left", "INBOX", ui)).toBe("archive");
    expect(swipeActionFor("right", "INBOX", ui)).toBe("trash");
    expect(swipeActionFor("left", undefined, ui)).toBe("archive");
  });

  it("is off for 'none'", () => {
    expect(swipeActionFor("right", "INBOX", { ...ui, swipeRightAction: "none" })).toBeNull();
  });

  it("is off in Trash and Spam", () => {
    expect(swipeActionFor("left", "TRASH", ui)).toBeNull();
    expect(swipeActionFor("right", "SPAM", ui)).toBeNull();
  });
});

describe("selection store", () => {
  afterEach(() => useSelection.getState().clear());

  it("toggles, selects all and clears", () => {
    const s = () => useSelection.getState();
    act(() => s().toggle("t_1"));
    act(() => s().toggle("t_2"));
    act(() => s().toggle("t_1"));
    expect([...s().ids]).toEqual(["t_2"]);
    act(() => s().selectAll(["t_1", "t_2", "t_3"]));
    expect(s().ids.size).toBe(3);
    act(() => s().clear());
    expect(s().ids.size).toBe(0);
  });
});
