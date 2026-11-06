import { fireEvent, screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { queryClient } from "../../api/cache";
import { useAuth } from "../../state/auth";
import { message } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { MessageCard } from "./MessageCard";

setupMsw();

const handlers = () => ({
  onToggle: jest.fn(),
  onStar: jest.fn(),
  onReply: jest.fn(),
  onUnreadFromHere: jest.fn(),
  onOpenDraft: jest.fn(),
});

beforeEach(() => {
  queryClient.clear();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
  server.use(
    http.get(`${API}/messages/:id/html`, () =>
      HttpResponse.text("<p>x</p>", { headers: { "Content-Type": "text/html" } }),
    ),
  );
});

describe("MessageCard", () => {
  it("collapsed: sender, snippet, a label for TalkBack; a tap expands", async () => {
    const h = handlers();
    await renderScreen(
      <MessageCard message={message({})} expanded={false} me="ala@example.com" {...h} />,
    );
    expect(screen.getByText("Przesyłam ofertę")).toBeOnTheScreen();
    const card = screen.getByRole("button", { name: /^Jan Kowalski, .*, zwinięta$/ });
    await fireEvent.press(card);
    expect(h.onToggle).toHaveBeenCalled();
    expect(screen.queryByTestId("message-html-m_1")).toBeNull();
  });

  it("expanded: 'do mnie' opens the details, the body loads", async () => {
    const h = handlers();
    await renderScreen(<MessageCard message={message({})} expanded me="ala@example.com" {...h} />);
    expect(screen.getByRole("button", { name: /rozwinięta$/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("do mnie ▾"));
    expect(screen.getByTestId("details-m_1")).toBeOnTheScreen();
    expect(screen.getByText("Jan Kowalski <jan@example.com>")).toBeOnTheScreen();
    expect(await screen.findByTestId("message-html-m_1")).toBeOnTheScreen();
  });

  it("menu: reply all, forward, unread from here; star", async () => {
    const h = handlers();
    await renderScreen(<MessageCard message={message({})} expanded me="ala@example.com" {...h} />);
    await fireEvent.press(screen.getByLabelText("Więcej opcji wiadomości"));
    await fireEvent.press(await screen.findByText("Odpowiedz wszystkim"));
    expect(h.onReply).toHaveBeenCalledWith("replyAll");
    await fireEvent.press(screen.getByLabelText("Więcej opcji wiadomości"));
    await fireEvent.press(await screen.findByText("Oznacz jako nieprzeczytane od tej wiadomości"));
    expect(h.onUnreadFromHere).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("Oznacz gwiazdką"));
    expect(h.onStar).toHaveBeenCalledWith(true);
  });

  it("a scheduled message shows 'Wysyłanie…' and no reply", async () => {
    await renderScreen(
      <MessageCard
        message={message({ labelIds: ["SCHEDULED"] })}
        expanded
        me="ala@example.com"
        {...handlers()}
      />,
    );
    expect(screen.getByText("Wysyłanie…")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Odpowiedz")).toBeNull();
  });

  it("a draft is a 'Wersja robocza' row that opens compose", async () => {
    const h = handlers();
    await renderScreen(
      <MessageCard
        message={message({ id: "m_9", draftId: "d_9", labelIds: ["DRAFT"] })}
        expanded
        me="ala@example.com"
        {...h}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: /^Wersja robocza/ }));
    expect(h.onOpenDraft).toHaveBeenCalledWith("d_9");
  });
});
