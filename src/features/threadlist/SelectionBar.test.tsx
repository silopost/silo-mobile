import { fireEvent, screen } from "@testing-library/react-native";
import { queryClient } from "../../api/cache";
import { keys } from "../../api/keys";
import { useSelection } from "../../state/selection";
import { thread, threadPage } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { ThreadActionsProvider } from "./actions";
import { SelectionBar } from "./SelectionBar";

let run: jest.Mock;

async function renderBar(labelId: string, threads: ReturnType<typeof thread>[]) {
  queryClient.setQueryData(keys.threads("acc_1", { labelId }), {
    pages: [threadPage(threads)],
    pageParams: [undefined],
  });
  useSelection.getState().selectAll(threads.map((th) => th.id));
  await renderScreen(
    <ThreadActionsProvider value={{ run }}>
      <SelectionBar accountId="acc_1" filter={{ labelId }} />
    </ThreadActionsProvider>,
  );
}

const openMenu = () => fireEvent.press(screen.getByLabelText("Więcej opcji"));

beforeEach(() => {
  queryClient.clear();
  run = jest.fn(async () => undefined);
});
afterEach(() => useSelection.getState().clear());

describe("SelectionBar", () => {
  it("marks read when any selected thread is unread; ends the selection", async () => {
    await renderBar("INBOX", [thread({ id: "t_1", unreadCount: 1 }), thread({ id: "t_2" })]);
    await fireEvent.press(screen.getByLabelText("Oznacz jako przeczytane"));
    expect(run).toHaveBeenCalledWith("read", ["t_1", "t_2"], { labelId: "INBOX" });
    expect(useSelection.getState().ids.size).toBe(0);
  });

  it("archives in the Inbox", async () => {
    await renderBar("INBOX", [thread({ id: "t_1" })]);
    await fireEvent.press(screen.getByLabelText("Archiwizuj"));
    expect(run).toHaveBeenLastCalledWith("archive", ["t_1"], { labelId: "INBOX" });
  });

  it("marks unread when all selected are read", async () => {
    await renderBar("INBOX", [thread({ id: "t_1" })]);
    await fireEvent.press(screen.getByLabelText("Oznacz jako nieprzeczytane"));
    expect(run).toHaveBeenCalledWith("unread", ["t_1"], { labelId: "INBOX" });
  });

  it("trash button moves to Trash", async () => {
    await renderBar("INBOX", [thread({ id: "t_1" })]);
    await fireEvent.press(screen.getByLabelText("Usuń"));
    expect(run).toHaveBeenCalledWith("trash", ["t_1"], { labelId: "INBOX" });
  });

  it.each([
    ["Przenieś do", "moveTo"],
    ["Etykiety", "labels"],
    ["Oznacz gwiazdką", "star"],
    ["Zgłoś spam", "spam"],
  ])("menu '%s' runs %s", async (title, action) => {
    await renderBar("INBOX", [thread({ id: "t_1" })]);
    await openMenu();
    await fireEvent.press(await screen.findByText(title));
    expect(run).toHaveBeenCalledWith(action, ["t_1"], { labelId: "INBOX" });
  });

  it("menu unstars when every selected thread is starred", async () => {
    await renderBar("INBOX", [thread({ id: "t_1", labelIds: ["INBOX", "STARRED"] })]);
    await openMenu();
    await fireEvent.press(await screen.findByText("Usuń gwiazdkę"));
    expect(run).toHaveBeenCalledWith("unstar", ["t_1"], { labelId: "INBOX" });
  });

  it("in Trash deletes forever and restores from the menu", async () => {
    await renderBar("TRASH", [thread({ id: "t_1", labelIds: ["TRASH"] })]);
    expect(screen.queryByLabelText("Archiwizuj")).toBeNull();
    await openMenu();
    expect(screen.queryByText("Zgłoś spam")).toBeNull();
    await fireEvent.press(await screen.findByText("Przywróć z kosza"));
    expect(run).toHaveBeenCalledWith("untrash", ["t_1"], { labelId: "TRASH" });
  });

  it("in Spam says not spam and deletes forever", async () => {
    await renderBar("SPAM", [thread({ id: "t_1", labelIds: ["SPAM"] })]);
    await fireEvent.press(screen.getByLabelText("To nie spam"));
    expect(run).toHaveBeenCalledWith("notSpam", ["t_1"], { labelId: "SPAM" });
  });

  it("delete forever in Trash", async () => {
    await renderBar("TRASH", [thread({ id: "t_1", labelIds: ["TRASH"] })]);
    await fireEvent.press(screen.getByLabelText("Usuń na zawsze"));
    expect(run).toHaveBeenCalledWith("deleteForever", ["t_1"], { labelId: "TRASH" });
  });
});
