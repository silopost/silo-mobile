import { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { useAuth } from "../../state/auth";
import { useToasts } from "../../state/toasts";
import { message } from "../../test/fixtures";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { openReply, replyTarget } from "./actions";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

setupMsw();

const draft = {
  id: "d_7",
  accountId: "acc_1",
  threadId: "t_1",
  messageId: "m_7",
  attachments: null,
  bcc: null,
  cc: null,
  to: null,
  bodyHtml: "",
  bodyJson: null,
  inReplyToMessageId: "m_1",
  lastSend: null,
  serverChanged: false,
  subject: "Re: Oferta",
  syncedVersion: 0,
  updatedAt: "2026-11-05T10:00:00Z",
  version: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  useToasts.setState({ current: null });
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

describe("openReply", () => {
  it("creates the draft with POST /drafts and opens compose; a double tap creates one", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/drafts`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(draft, { status: 201 });
      }),
    );
    const qc = new QueryClient();

    await Promise.all([openReply(qc, "m_1", "replyAll"), openReply(qc, "m_1", "replyAll")]);

    expect(bodies).toEqual([{ replyToMessageId: "m_1", mode: "replyAll" }]);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/compose?draftId=d_7");
  });

  it("tells what a forward could not carry over (Draft.warnings, server 0.4.0)", async () => {
    server.use(
      http.post(`${API}/drafts`, () =>
        HttpResponse.json(
          {
            ...draft,
            subject: "Fwd: Oferta",
            warnings: ["attachments_unavailable", "attachments_too_large"],
          },
          { status: 201 },
        ),
      ),
    );
    await openReply(new QueryClient(), "m_1", "forward");
    expect(router.push).toHaveBeenCalledWith("/compose?draftId=d_7");
    expect(useToasts.getState().current?.message).toBe(
      "Części załączników oryginału nie udało się pobrać. Załączniki przekraczające limit rozmiaru zostały pominięte.",
    );
  });

  it("shows a snackbar when the draft cannot be created", async () => {
    server.use(
      http.post(`${API}/drafts`, () => HttpResponse.json({ status: 500 }, { status: 500 })),
    );
    await openReply(new QueryClient(), "m_1", "forward");
    expect(router.push).not.toHaveBeenCalled();
    expect(useToasts.getState().current?.message).toBe("Nie udało się. Spróbuj ponownie.");
  });
});

describe("replyTarget", () => {
  it("is the last message that is not a draft or waiting to be sent", () => {
    const ms = [
      message({ id: "m_1" }),
      message({ id: "m_2" }),
      message({ id: "m_3", labelIds: ["SCHEDULED"] }),
      message({ id: "m_4", labelIds: ["DRAFT"], draftId: "d_4" }),
    ];
    expect(replyTarget(ms)?.id).toBe("m_2");
    expect(replyTarget([])).toBeUndefined();
  });
});
