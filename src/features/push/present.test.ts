import * as TaskManager from "expo-task-manager";
import { delay, http, HttpResponse } from "msw";
import { AppState } from "react-native";
import type { MessageSummary } from "../../api/types";
import { setLocale } from "../../lib/i18n";
import { useAuth } from "../../state/auth";
import { account, sessionBody } from "../../test/fixtures";
import { notifications } from "../../test/push";
import { signIn } from "../../test/router";
import { API, server, setupMsw } from "../../test/server";
import { resetAuth, secureStore } from "../../test/utils";
import { MAIL_PUSH_TASK } from "./background";
import { handleRemotePush, plainText, presentMailPush } from "./present";
import { mailPushHref, parseMailPush, type MailPush } from "./route";

setupMsw();

const work = { ...account, id: "acc_2", email: "praca@example.com", position: 1 };

const summary = (over: Partial<MessageSummary> = {}): MessageSummary => ({
  id: "m_1",
  threadId: "t_1",
  accountId: "acc_2",
  from: { name: "Jan Kowalski", email: "jan@example.org" },
  date: "2026-11-26T10:00:00Z",
  subject: "Spotkanie",
  snippet: "Czy pasuje jutro o 10?",
  ...over,
});

const push = (over: Partial<MailPush> = {}): MailPush => ({
  accountId: "acc_2",
  threadId: "t_1",
  count: 1,
  messageIds: ["m_1"],
  ...over,
});

let asked: string[];

/** GET /messages answers `list` (newest first, as the server does); GET /session two accounts. */
function serve(list: MessageSummary[], accounts = [account, work]) {
  server.use(
    http.get(`${API}/messages`, ({ request }) => {
      asked.push(new URL(request.url).searchParams.getAll("ids").join("|"));
      return HttpResponse.json({ messages: list });
    }),
    http.get(`${API}/session`, () => HttpResponse.json({ ...sessionBody, accounts })),
  );
}

const presented = () => notifications().__presented;

beforeEach(() => {
  asked = [];
  resetAuth();
  signIn();
  server.use(
    http.get(`${API}/session`, () =>
      HttpResponse.json({ ...sessionBody, accounts: [account, work] }),
    ),
  );
});

describe("presentMailPush", () => {
  it("shows each message like Gmail: sender, subject and snippet, account as sub-text", async () => {
    serve([
      summary({ id: "m_2", threadId: "t_2", date: "2026-11-26T10:05:00Z", snippet: "" }),
      summary(),
    ]);

    await presentMailPush(push({ count: 2, messageIds: ["m_2", "m_1"] }));

    expect(asked).toEqual(["m_2,m_1"]);
    // Oldest first, so the newest ends on top; only the first one plays the sound.
    expect(presented()).toEqual([
      {
        identifier: "mail-m_1",
        content: {
          title: "Jan Kowalski",
          body: "Spotkanie\nCzy pasuje jutro o 10?",
          subtitle: "praca@example.com",
          data: { v: 1, type: "mail", accountId: "acc_2", threadId: "t_1", count: 1 },
          threadIdentifier: "mail-acc_2",
          priority: "high",
          sound: "default",
        },
        trigger: { channelId: "mail" },
      },
      expect.objectContaining({
        identifier: "mail-m_2",
        content: expect.objectContaining({
          title: "Jan Kowalski",
          body: "Spotkanie",
          sound: false,
        }),
      }),
    ]);
    // A tap opens the thread of that message.
    const data = parseMailPush(presented()[1]?.content.data);
    expect(data && mailPushHref(data, [account, work])).toBe("/u/1/inbox/t_2");
  });

  it("leaves out the sub-text with one account and puts placeholders for empty fields", async () => {
    serve(
      [
        summary({
          from: { name: "  ", email: "" },
          subject: "\u202e\u0007 ",
          snippet: "a\u0000b\n\nc",
        }),
      ],
      [account],
    );

    await presentMailPush(push());

    expect(presented()[0]?.content).toMatchObject({
      title: "(nieznany nadawca)",
      body: "(bez tematu)\na b c",
    });
    expect(presented()[0]?.content.subtitle).toBeUndefined();
  });

  it("falls back to the sender's address and in English when that is the language", async () => {
    setLocale("en");
    serve([summary({ from: { name: "", email: "jan@example.org" }, subject: "" })]);

    await presentMailPush(push());

    expect(presented()[0]?.content).toMatchObject({
      title: "jan@example.org",
      body: "(no subject)\nCzy pasuje jutro o 10?",
    });
  });

  it("shows one generic notification for a burst larger than the push names", async () => {
    serve([]);

    await presentMailPush(push({ count: 9, messageIds: null, threadId: "t_9" }));

    expect(asked).toEqual([]);
    expect(presented()).toEqual([
      {
        identifier: "mail-acc_2",
        content: {
          title: "9 nowych wiadomości",
          subtitle: "praca@example.com",
          data: { v: 1, type: "mail", accountId: "acc_2", threadId: "t_9", count: 9 },
          threadIdentifier: "mail-acc_2",
          priority: "high",
          sound: "default",
        },
        trigger: { channelId: "mail" },
      },
    ]);
  });

  it("shows the generic notification for an old server's push (no messageIds)", async () => {
    serve([]);
    const old = parseMailPush({
      v: 1,
      type: "mail",
      accountId: "acc_2",
      threadId: "t_1",
      count: 1,
    });

    await presentMailPush(old!);

    expect(presented()).toHaveLength(1);
    expect(presented()[0]?.content).toMatchObject({
      title: "Nowa wiadomość",
      data: { threadId: "t_1" },
    });
    expect(presented()[0]?.content.body).toBeUndefined();
  });

  it.each([
    ["the server fails", () => HttpResponse.json({}, { status: 500 })],
    ["the network fails", () => HttpResponse.error()],
    ["the session ended", () => HttpResponse.json({}, { status: 401 })],
  ])("shows the generic notification when %s", async (_, answer) => {
    server.use(http.get(`${API}/messages`, answer));

    await presentMailPush(push({ count: 2, messageIds: ["m_2", "m_1"] }));

    expect(presented()).toEqual([
      expect.objectContaining({
        identifier: "mail-acc_2",
        content: expect.objectContaining({ title: "2 nowe wiadomości", sound: "default" }),
      }),
    ]);
    expect(JSON.stringify(presented())).not.toContain("Spotkanie");
  });

  it("shows the generic notification when the server takes too long", async () => {
    server.use(
      http.get(`${API}/messages`, async () => {
        await delay(1000);
        return HttpResponse.json({ messages: [summary()] });
      }),
    );
    const started = Date.now();

    await presentMailPush(push(), 100);

    expect(Date.now() - started).toBeLessThan(900);
    expect(presented()).toEqual([
      expect.objectContaining({ content: expect.objectContaining({ title: "Nowa wiadomość" }) }),
    ]);
  });

  it("shows nothing for messages already gone", async () => {
    serve([]);
    await presentMailPush(push());
    expect(presented()).toEqual([]);
  });

  it("shows nothing after sign-out, also in a process the push just started", async () => {
    serve([summary()]);
    resetAuth();
    secureStore().clear();
    await presentMailPush(push());

    useAuth.setState({ status: "loading", serverUrl: null, token: null });
    await presentMailPush(push());

    expect(presented()).toEqual([]);
    expect(asked).toEqual([]);
  });

  it("reads the stored session in a process the push just started", async () => {
    serve([summary()]);
    useAuth.setState({ status: "loading", serverUrl: null, token: null });

    await presentMailPush(push());

    expect(presented()).toHaveLength(1);
  });
});

describe("the background task", () => {
  const run = (data: unknown) =>
    (TaskManager as unknown as { __run: (name: string, data: unknown) => Promise<void> }).__run(
      MAIL_PUSH_TASK,
      data,
    );
  const fcm = (data: unknown, notification: unknown = null) => ({
    notification,
    data: { body: JSON.stringify(data), dataString: JSON.stringify(data), experienceId: "x" },
  });
  const mail = {
    v: 1,
    type: "mail",
    accountId: "acc_2",
    threadId: "t_1",
    count: 1,
    messageIds: ["m_1"],
  };

  it("is registered for remote notifications at start-up", () => {
    expect(notifications().registerTaskAsync).toHaveBeenCalledWith(MAIL_PUSH_TASK);
  });

  it("presents a data-only mail push", async () => {
    serve([summary()]);
    await run(fcm(mail));
    expect(presented().map((n) => n.identifier)).toEqual(["mail-m_1"]);
  });

  it("leaves a titled push to the system, and shows nothing in the foreground", async () => {
    serve([summary()]);
    await run(fcm(mail, { title: "Nowa wiadomość" }));
    // AppState is a jest mock; the app reads currentState, a string on a device.
    const before = Object.getOwnPropertyDescriptor(AppState, "currentState");
    Object.defineProperty(AppState, "currentState", { value: "active", configurable: true });
    try {
      await run(fcm(mail));
    } finally {
      if (before) Object.defineProperty(AppState, "currentState", before);
    }

    expect(presented()).toEqual([]);
  });

  it("ignores taps, other payloads and broken data", async () => {
    serve([summary()]);
    await run({ actionIdentifier: "expo.modules.notifications.actions.DEFAULT", notification: {} });
    await run(fcm({ v: 1, type: "calendar", accountId: "acc_2" }));
    await run({ notification: null, data: { dataString: "{not json" } });
    await run({ notification: null, data: {} });
    await handleRemotePush(null);

    expect(presented()).toEqual([]);
  });
});

describe("plainText", () => {
  it("makes one line without control or bidi characters", () => {
    expect(plainText(" a\tb\r\n\u202ec\u200bd\ufeff ", 50)).toBe("a b c d");
    expect(plainText(null, 5)).toBe("");
  });

  it("cuts a long text with an ellipsis, not inside a character", () => {
    expect(plainText("abcdefgh", 5)).toBe("abcd\u2026");
    expect(plainText("😀😀😀😀😀😀", 3)).toBe("😀😀\u2026");
    expect(plainText("abc", 3)).toBe("abc");
  });
});
