import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { queryClient } from "../../api/cache";
import { keys } from "../../api/keys";
import { useAuth } from "../../state/auth";
import { label, labels } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { LabelsSheet, labelStatus } from "./LabelsSheet";

setupMsw();

const threads = [
  { id: "t_1", labelIds: ["INBOX", "l_1"] },
  { id: "t_2", labelIds: ["l_1", "l_2"] },
];

beforeEach(() => {
  queryClient.clear();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
  queryClient.setQueryData(keys.labels("acc_1"), { labels });
});

async function renderSheet() {
  const onApply = jest.fn();
  const onDismiss = jest.fn();
  await renderScreen(
    <LabelsSheet
      visible
      onDismiss={onDismiss}
      accountId="acc_1"
      threads={threads}
      onApply={onApply}
    />,
  );
  return { onApply, onDismiss };
}

describe("LabelsSheet", () => {
  it("labelStatus: all, some or none of the threads", () => {
    expect(labelStatus("l_1", threads)).toBe("checked");
    expect(labelStatus("l_2", threads)).toBe("indeterminate");
    expect(labelStatus("l_3", threads)).toBe("unchecked");
  });

  it("lists user labels with their state and applies the changes once on OK", async () => {
    const { onApply } = await renderSheet();
    expect(await screen.findByRole("checkbox", { name: "Praca" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Rachunki, na części zaznaczonych wątków" }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Ukryta" })).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "INBOX" })).toBeNull();

    await fireEvent.press(screen.getByRole("checkbox", { name: "Praca" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: /^Rachunki/ }));
    expect(onApply).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("OK"));
    expect(onApply).toHaveBeenCalledWith(["l_2"], ["l_1"]);
  });

  it("OK without a change only closes; Anuluj closes", async () => {
    const { onApply, onDismiss } = await renderSheet();
    await fireEvent.press(await screen.findByText("OK"));
    await fireEvent.press(screen.getByText("Anuluj"));
    expect(onApply).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("creates a label with POST /labels, refetches the labels and checks the new one", async () => {
    const created: unknown[] = [];
    let labelFetches = 0;
    const newLabel = label({ id: "l_7", name: "Wakacje", type: "user" });
    server.use(
      http.post(`${API}/labels`, async ({ request }) => {
        created.push(await request.json());
        return HttpResponse.json(newLabel, { status: 201 });
      }),
      http.get(`${API}/labels`, () => {
        labelFetches++;
        return HttpResponse.json({ labels: [...labels, newLabel] });
      }),
    );
    const { onApply } = await renderSheet();
    await fireEvent.changeText(await screen.findByLabelText("Nowa etykieta"), "Wakacje ");
    await fireEvent.press(screen.getByText("Utwórz"));

    expect(await screen.findByRole("checkbox", { name: "Wakacje" })).toBeChecked();
    expect(created).toEqual([{ accountId: "acc_1", name: "Wakacje", type: "user" }]);
    await waitFor(() => expect(labelFetches).toBeGreaterThan(0));
    await fireEvent.press(screen.getByText("OK"));
    expect(onApply).toHaveBeenCalledWith(["l_7"], []);
  });
});
