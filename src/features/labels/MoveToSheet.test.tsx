import { fireEvent, screen, within } from "@testing-library/react-native";
import { queryClient } from "../../api/cache";
import { keys } from "../../api/keys";
import { label, labels } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { MoveToSheet } from "./MoveToSheet";

beforeEach(() => {
  queryClient.clear();
  queryClient.setQueryData(keys.labels("acc_1"), {
    labels: [...labels, label({ id: "l_9", name: "Projekty", type: "folder" })],
  });
});

async function renderSheet(currentLabelId?: string) {
  const onSelect = jest.fn();
  await renderScreen(
    <MoveToSheet
      visible
      onDismiss={jest.fn()}
      accountId="acc_1"
      currentLabelId={currentLabelId}
      onSelect={onSelect}
    />,
  );
  return onSelect;
}

describe("MoveToSheet", () => {
  it("lists Gmail's places, then folders, then user labels", async () => {
    await renderSheet();
    const sheet = await screen.findByTestId("move-to-sheet");
    const titles = within(sheet)
      .getAllByTestId(/^move-[^-]+$/)
      .map((row) => row.props.testID);
    expect(titles).toEqual([
      "move-INBOX",
      "move-SPAM",
      "move-TRASH",
      "move-ARCHIVE",
      "move-l_9",
      "move-l_1",
      "move-l_2",
      "move-l_3",
    ]);
    expect(screen.getByText("Odebrane")).toBeOnTheScreen();
    expect(screen.getByText("Archiwum")).toBeOnTheScreen();
    expect(screen.getByText("Projekty")).toBeOnTheScreen();
  });

  it("greys out the current place and reports the chosen one", async () => {
    const onSelect = await renderSheet("INBOX");
    expect(screen.getByTestId("move-INBOX")).toBeDisabled();
    expect(screen.getByText("bieżąca lokalizacja")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Praca"));
    expect(onSelect).toHaveBeenCalledWith("l_1");
  });
});
