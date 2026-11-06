import { fireEvent, screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { queryClient } from "../../api/cache";
import type { Address } from "../../api/types";
import { useAuth } from "../../state/auth";
import { renderScreen } from "../../test/render";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { RecipientInput } from "./RecipientInput";

setupMsw();

beforeEach(() => {
  queryClient.clear();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

let latest: Address[] = [];

function Field({ initial = [], invalid }: { initial?: Address[]; invalid?: string }) {
  const [value, setValue] = useState<Address[]>(initial);
  return (
    <RecipientInput
      label="Do"
      value={value}
      invalidAddress={invalid}
      onChange={(v) => {
        latest = v;
        setValue(v);
      }}
    />
  );
}

const input = () => screen.getByLabelText("Dodaj odbiorców: Do");

describe("RecipientInput", () => {
  it("turns the typed address into a chip on Enter", async () => {
    await renderScreen(<Field />);
    await fireEvent.changeText(input(), "jan@example.com");
    await fireEvent(input(), "submitEditing");
    expect(latest).toEqual([{ name: "", email: "jan@example.com" }]);
    expect(screen.getByRole("button", { name: "jan@example.com" })).toBeTruthy();
    expect(input().props.value).toBe("");
  });

  it("a comma ends an address too", async () => {
    await renderScreen(<Field />);
    await fireEvent.changeText(input(), "jan@example.com,");
    expect(latest).toEqual([{ name: "", email: "jan@example.com" }]);
  });

  it("splits a pasted list of two addresses", async () => {
    await renderScreen(<Field />);
    await fireEvent.changeText(input(), "Jan <jan@example.com>, ola@example.com");
    expect(latest).toEqual([
      { name: "Jan", email: "jan@example.com" },
      { name: "", email: "ola@example.com" },
    ]);
  });

  it("suggests contacts from GET /contacts/autocomplete and adds the chosen one", async () => {
    const queries: string[] = [];
    server.use(
      http.get(`${API}/contacts/autocomplete`, ({ request }) => {
        queries.push(new URL(request.url).searchParams.get("q") ?? "");
        return HttpResponse.json({
          contacts: [
            { name: "Jan Kowalski", email: "jan@example.com" },
            { name: "", email: "janina@example.com" },
          ],
        });
      }),
    );
    await renderScreen(<Field />);
    await fireEvent(input(), "focus");
    await fireEvent.changeText(input(), "ja");

    await fireEvent.press(
      await screen.findByRole("button", { name: "Jan Kowalski, jan@example.com" }),
    );
    expect(queries).toEqual(["ja"]);
    expect(latest).toEqual([{ name: "Jan Kowalski", email: "jan@example.com" }]);
  });

  it("removes a chip with its x", async () => {
    await renderScreen(<Field initial={[{ name: "Jan", email: "jan@example.com" }]} />);
    await fireEvent.press(screen.getByRole("button", { name: "Usuń jan@example.com" }));
    expect(latest).toEqual([]);
  });

  it("marks the address the server refused", async () => {
    await renderScreen(<Field initial={[{ name: "", email: "zly@" }]} invalid="zly@" />);
    expect(screen.getByRole("button", { name: "zly@, Nieprawidłowy adres" })).toBeTruthy();
    expect(screen.getByText("Nieprawidłowy adres: zly@")).toBeTruthy();
  });
});
