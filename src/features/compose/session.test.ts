import { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { keys } from "../../api/keys";
import type { Draft } from "../../api/types";
import { useAuth } from "../../state/auth";
import { useCompose } from "../../state/compose";
import { useToasts } from "../../state/toasts";
import { draft } from "../../test/fixtures";
import { API, SERVER_URL, server, setupMsw } from "../../test/server";
import { composeConfig, getSession, openLoaded, resetSessions, type DraftSession } from "./session";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

setupMsw();

const autosaveMs = composeConfig.autosaveMs;
let qc: QueryClient;

beforeAll(() => {
  composeConfig.autosaveMs = 10;
});
afterAll(() => {
  composeConfig.autosaveMs = autosaveMs;
});
beforeEach(() => {
  jest.clearAllMocks();
  resetSessions();
  qc = new QueryClient();
  useToasts.setState({ current: null });
  useCompose.setState({ remoteVersions: {}, failures: {} });
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++) await wait(5);
  expect(check()).toBe(true);
}

/** PUT /drafts/d_1 answering version + 1; records the bodies. */
function acceptSaves(bodies: Record<string, unknown>[], over: Partial<Draft> = {}) {
  server.use(
    http.put(`${API}/drafts/d_1`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      bodies.push(body);
      const version = Number(body.version) + 1;
      return HttpResponse.json(
        draft({ version, syncedVersion: body.syncNow ? version : 0, ...over }),
      );
    }),
  );
}

function open(d: Draft = draft({}), created = false): DraftSession {
  return openLoaded(qc, d, { created });
}

describe("DraftSession autosave", () => {
  it("saves after the idle time with the edited version and takes the new one", async () => {
    const bodies: Record<string, unknown>[] = [];
    acceptSaves(bodies);
    const s = open();
    s.edit(() => ({ subject: "A" }));
    s.edit(() => ({ subject: "Ab" }));
    expect(s.getState().dirty).toBe(true);

    await until(() => s.getState().save === "saved");
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ version: 1, subject: "Ab" });
    expect(bodies[0]).not.toHaveProperty("syncNow");
    expect(s.getState().version).toBe(2);
    expect(s.getState().dirty).toBe(false);

    s.edit(() => ({ subject: "Abc" }));
    await until(() => bodies.length === 2 && s.getState().save === "saved");
    expect(bodies[1]).toMatchObject({ version: 2, subject: "Abc" });
    expect(s.getState().version).toBe(3);
  });

  it("a 409 draft_version_conflict keeps the edits and offers Wczytaj with Problem.current", async () => {
    const current = draft({ version: 5, subject: "Z innego urządzenia" });
    server.use(
      http.put(`${API}/drafts/d_1`, () =>
        HttpResponse.json(
          { status: 409, code: "draft_version_conflict", currentVersion: 5, current },
          { status: 409 },
        ),
      ),
    );
    const s = open();
    s.edit(() => ({ subject: "Moje" }));
    await until(() => s.getState().conflict);
    expect(s.getState().conflictCurrent?.version).toBe(5);
    expect(s.getState().form.subject).toBe("Moje");

    // Wczytaj: the form becomes the server's draft, no GET needed.
    await s.reload();
    expect(s.getState()).toMatchObject({ conflict: false, version: 5, dirty: false });
    expect(s.getState().form.subject).toBe("Z innego urządzenia");
  });

  it("Nadpisz saves the local content over the current version", async () => {
    let calls = 0;
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.put(`${API}/drafts/d_1`, async ({ request }) => {
        calls += 1;
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        if (calls === 1)
          return HttpResponse.json(
            { status: 409, code: "draft_version_conflict", current: draft({ version: 5 }) },
            { status: 409 },
          );
        return HttpResponse.json(draft({ version: 6 }));
      }),
    );
    const s = open();
    s.edit(() => ({ subject: "Moje" }));
    await until(() => s.getState().conflict);

    await s.overwrite();
    expect(bodies[1]).toMatchObject({ version: 5, subject: "Moje" });
    expect(s.getState()).toMatchObject({ conflict: false, version: 6 });
  });

  it("Wczytaj after a draft.updated event fetches the draft", async () => {
    server.use(
      http.get(`${API}/drafts/d_1`, () =>
        HttpResponse.json(draft({ version: 4, subject: "Nowszy" })),
      ),
    );
    const s = open();
    useCompose.getState().setRemoteVersion("d_1", 4);
    await s.reload();
    expect(s.getState()).toMatchObject({ version: 4, loaded: true });
    expect(s.getState().form.subject).toBe("Nowszy");
  });

  it("keeps the refused recipient of a 400 validation_failed", async () => {
    server.use(
      http.put(`${API}/drafts/d_1`, () =>
        HttpResponse.json(
          { status: 400, code: "validation_failed", address: "zly@", field: "cc" },
          { status: 400 },
        ),
      ),
    );
    const s = open();
    s.edit(() => ({ cc: [{ email: "zly@", name: "" }] }));
    await until(() => s.getState().save === "error");
    expect(s.getState().invalid).toEqual({ address: "zly@", field: "cc" });
    // Removing the address clears the mark.
    s.edit(() => ({ cc: [] }));
    expect(s.getState().invalid).toBeNull();
  });
});

describe("DraftSession close", () => {
  it("flushes unsaved edits with syncNow and shows 'Zapisano wersję roboczą'", async () => {
    const bodies: Record<string, unknown>[] = [];
    acceptSaves(bodies);
    composeConfig.autosaveMs = 10_000;
    try {
      const s = open();
      s.edit(() => ({ subject: "Na zamknięcie" }));
      await s.close();
      expect(bodies).toEqual([
        expect.objectContaining({ subject: "Na zamknięcie", syncNow: true }),
      ]);
      expect(useToasts.getState().current?.message).toBe("Zapisano wersję roboczą");
    } finally {
      composeConfig.autosaveMs = 10;
    }
  });

  it("an autosave not yet in the Drafts folder is sent again with syncNow", async () => {
    const bodies: Record<string, unknown>[] = [];
    acceptSaves(bodies);
    const s = open();
    s.edit(() => ({ subject: "A" }));
    await until(() => s.getState().save === "saved");
    await s.close();
    expect(bodies.map((b) => b.syncNow)).toEqual([undefined, true]);
  });

  it("the app going to the background flushes with syncNow", async () => {
    const bodies: Record<string, unknown>[] = [];
    acceptSaves(bodies);
    composeConfig.autosaveMs = 10_000;
    try {
      const s = open();
      s.edit(() => ({ subject: "Tło" }));
      await s.flushNow();
      expect(bodies).toEqual([expect.objectContaining({ subject: "Tło", syncNow: true })]);
      // Nothing left: a second flush sends nothing.
      await s.flushNow();
      expect(bodies).toHaveLength(1);
    } finally {
      composeConfig.autosaveMs = 10;
    }
  });

  it("a new draft nobody wrote in is deleted", async () => {
    let deleted = false;
    server.use(
      http.delete(`${API}/drafts/d_1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const s = open(draft({}), true);
    await s.close();
    expect(deleted).toBe(true);
    expect(qc.getQueryData(keys.draft("d_1"))).toBeUndefined();
  });

  it("an existing draft left untouched is neither saved nor deleted", async () => {
    const s = open(draft({}), false);
    await s.close();
    expect(useToasts.getState().current).toBeNull();
  });

  it("discard deletes the draft and says so", async () => {
    let deleted = false;
    server.use(
      http.delete(`${API}/drafts/d_1`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const s = open();
    await s.discard();
    expect(deleted).toBe(true);
    expect(useToasts.getState().current?.message).toBe("Odrzucono wersję roboczą");
  });
});

describe("DraftSession send", () => {
  it("refuses locally without a recipient", async () => {
    const s = open(draft({ to: [] }));
    expect(await s.send()).toBe(false);
    expect(s.getState().error).toBe("Dodaj co najmniej jednego odbiorcę.");
  });

  it("saves, sends, then undo cancels the outbound message and reopens the draft", async () => {
    const order: string[] = [];
    const undoUntil = new Date(Date.now() + 5000).toISOString();
    server.use(
      http.put(`${API}/drafts/d_1`, () => {
        order.push("PUT");
        return HttpResponse.json(draft({ version: 2 }));
      }),
      http.post(`${API}/drafts/d_1/send`, () => {
        order.push("SEND");
        return HttpResponse.json({ messageId: "m_9", outboundId: "o_1", undoUntil });
      }),
      http.post(`${API}/outbound/o_1/cancel`, () => {
        order.push("CANCEL");
        return HttpResponse.json(draft({ version: 3, subject: "Wróciło" }));
      }),
    );
    const s = open(draft({ to: [{ email: "jan@example.com", name: "Jan" }] }));
    s.edit(() => ({ subject: "Wróciło" }));

    expect(await s.send()).toBe(true);
    expect(order).toEqual(["PUT", "SEND"]);
    const shown = useToasts.getState().current!;
    expect(shown.message).toBe("Wysłano");
    expect(shown.action?.label).toBe("Cofnij");

    shown.action!.onPress();
    await until(() => order.includes("CANCEL") && (router.push as jest.Mock).mock.calls.length > 0);
    expect(router.push).toHaveBeenCalledWith("/compose?draftId=d_1");
    // The new session is fed with the cancel's answer.
    expect(getSession(qc, "d_1").getState()).toMatchObject({ loaded: true, version: 3 });
    expect(getSession(qc, "d_1").getState().form.subject).toBe("Wróciło");
  });

  it("undo too late (409) says the message was sent", async () => {
    server.use(
      http.post(`${API}/drafts/d_1/send`, () =>
        HttpResponse.json({
          messageId: "m_9",
          outboundId: "o_1",
          undoUntil: new Date(Date.now() + 5000).toISOString(),
        }),
      ),
      http.post(`${API}/outbound/o_1/cancel`, () =>
        HttpResponse.json({ status: 409, code: "send_in_progress" }, { status: 409 }),
      ),
    );
    const s = open(draft({ to: [{ email: "jan@example.com", name: "" }] }));
    await s.send();
    useToasts.getState().current!.action!.onPress();
    await until(
      () => useToasts.getState().current?.message === "Za późno, wiadomość została wysłana",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    [
      { code: "invalid_address", address: "zly@", field: "to" },
      422,
      "Nieprawidłowy adres odbiorcy: zly@. Popraw adres oznaczony na czerwono.",
    ],
    [{ code: "no_recipients" }, 422, "Dodaj co najmniej jednego odbiorcę."],
    [
      { code: "message_too_large", limit: 1024 * 1024, size: 2 * 1024 * 1024 },
      413,
      "Wiadomość z załącznikami (2,0 MB) przekracza limit 1,0 MB.",
    ],
    [
      { code: "upstream_smtp_error", detail: "554 rejected" },
      502,
      "Serwer poczty odrzucił wiadomość: 554 rejected",
    ],
  ])("send refused with %j shows the reason", async (problem, status, message) => {
    server.use(
      http.post(`${API}/drafts/d_1/send`, () =>
        HttpResponse.json({ status, ...problem }, { status }),
      ),
    );
    const s = open(draft({ to: [{ email: "zly@", name: "" }] }));
    expect(await s.send()).toBe(false);
    expect(s.getState()).toMatchObject({ sending: false, error: message });
    if (problem.code === "invalid_address")
      expect(s.getState().invalid).toEqual({ address: "zly@", field: "to" });
  });

  it("a failed send recorded on the draft (lastSend) is shown after loading", () => {
    open(
      draft({
        lastSend: {
          status: "failed",
          error: "550 no such user",
          failedRecipients: ["x@example.com"],
          outboundId: "o_1",
          updatedAt: "2026-11-05T10:00:00Z",
        },
      }),
    );
    expect(useCompose.getState().failures.d_1).toEqual({
      error: "550 no such user",
      failedRecipients: ["x@example.com"],
    });
  });
});

describe("DraftSession uploads", () => {
  it("refuses a file over GET /meta maxAttachmentBytes before uploading", () => {
    qc.setQueryData(keys.meta(SERVER_URL), { maxAttachmentBytes: 1024 });
    const s = open();
    s.addFiles([{ uri: "file:///big.bin", name: "big.bin", type: "x/y", size: 4096 }]);
    expect(s.getState().uploads).toEqual([]);
    expect(useToasts.getState().current?.message).toBe("Plik big.bin jest za duży (limit 1 KB)");
  });
});
