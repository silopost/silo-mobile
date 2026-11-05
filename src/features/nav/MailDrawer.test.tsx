import { fireEvent, screen, within } from "@testing-library/react-native";
import { labels } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { MailDrawer } from "./MailDrawer";

async function renderDrawer(activeSlug: string | undefined) {
  const onSelect = jest.fn();
  const onSettings = jest.fn();
  const onCreateLabel = jest.fn();
  const result = await renderScreen(
    <MailDrawer
      labels={labels}
      activeSlug={activeSlug}
      onSelect={onSelect}
      onSettings={onSettings}
      onCreateLabel={onCreateLabel}
    />,
  );
  return { ...result, onSelect, onSettings, onCreateLabel };
}

describe("MailDrawer", () => {
  it("lists the system views in Gmail's order with their counters", async () => {
    await renderDrawer("inbox");

    const names = screen
      .getAllByTestId(/^nav-(?!l_)/)
      .map((el) => el.props.accessibilityLabel.split(",")[0]);
    expect(names).toEqual([
      "Odebrane",
      "Oznaczone gwiazdką",
      "Odłożone",
      "Ważne",
      "Wysłane",
      "Zaplanowane",
      "Wersje robocze",
      "Wszystkie",
      "Spam",
      "Kosz",
      "Archiwum",
    ]);
    expect(screen.getByRole("button", { name: "Odebrane, 12 nieprzeczytanych" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Wersje robocze, 2 wątki" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Zaplanowane, 1 wątek" })).toBeOnTheScreen();
    // Starred has no counter in Gmail even with threads in it.
    expect(screen.getByRole("button", { name: "Oznaczone gwiazdką" })).toBeOnTheScreen();
    // Above 99 the counter reads 99+.
    expect(within(screen.getByTestId("nav-spam")).getByText("99+")).toBeOnTheScreen();
  });

  it("lists the listed user labels with unread counters", async () => {
    await renderDrawer("inbox");

    expect(screen.getByRole("header", { name: "Etykiety" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Praca, 3 nieprzeczytane" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Rachunki" })).toBeOnTheScreen();
    expect(screen.queryByText("Ukryta")).toBeNull();
    expect(screen.getByRole("button", { name: "Utwórz nową" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ustawienia" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Pomoc i opinie" })).toBeDisabled();
  });

  it("marks the active label as selected", async () => {
    await renderDrawer("l_1");

    expect(screen.getByTestId("nav-l_1")).toBeSelected();
    expect(screen.getByTestId("nav-inbox")).not.toBeSelected();
  });

  it("reports the chosen label, settings and label creation", async () => {
    const { onSelect, onSettings, onCreateLabel } = await renderDrawer("inbox");

    await fireEvent.press(screen.getByRole("button", { name: /^Oznaczone gwiazdką/ }));
    await fireEvent.press(screen.getByRole("button", { name: /^Praca/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Ustawienia" }));
    await fireEvent.press(screen.getByRole("button", { name: "Utwórz nową" }));

    expect(onSelect.mock.calls).toEqual([["starred"], ["l_1"]]);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(onCreateLabel).toHaveBeenCalledTimes(1);
  });
});
