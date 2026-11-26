import { mailPushHref, parseMailPush } from "./route";

const accounts = [
  { id: "acc_1", position: 0 },
  { id: "acc_2", position: 1 },
];

describe("parseMailPush", () => {
  it("reads a version 1 mail push", () => {
    expect(
      parseMailPush({ v: 1, type: "mail", accountId: "acc_2", threadId: "t_9", count: 1 }),
    ).toEqual({ accountId: "acc_2", threadId: "t_9", count: 1, messageIds: null });
  });

  it("reads the messages a push names (server 0.11.0) only when they are the whole burst", () => {
    const push = { v: 1, type: "mail", accountId: "acc_2", threadId: "t_9" };
    expect(parseMailPush({ ...push, count: 2, messageIds: ["m_2", "m_1"] })?.messageIds).toEqual([
      "m_2",
      "m_1",
    ]);
    // A larger burst names none; a list that is not the whole burst or not ids is ignored.
    expect(parseMailPush({ ...push, count: 9 })?.messageIds).toBeNull();
    expect(parseMailPush({ ...push, count: 3, messageIds: ["m_2", "m_1"] })?.messageIds).toBeNull();
    expect(parseMailPush({ ...push, count: 1, messageIds: ["<b>x</b>"] })?.messageIds).toBeNull();
    expect(parseMailPush({ ...push, count: 1, messageIds: "m_1" })?.messageIds).toBeNull();
    const many = Array.from({ length: 6 }, (_, i) => `m_${i}`);
    expect(parseMailPush({ ...push, count: 6, messageIds: many })?.messageIds).toBeNull();
  });

  it("ignores other types, versions and payloads without an account", () => {
    expect(parseMailPush({ v: 1, type: "calendar", accountId: "acc_1" })).toBeNull();
    expect(parseMailPush({ v: 2, type: "mail", accountId: "acc_1", count: 1 })).toBeNull();
    expect(parseMailPush({ v: 1, type: "mail", threadId: "t_1", count: 1 })).toBeNull();
    expect(parseMailPush(null)).toBeNull();
    expect(parseMailPush("mail")).toBeNull();
  });
});

describe("mailPushHref", () => {
  it("opens the thread of a single message in the Inbox of its account", () => {
    expect(mailPushHref({ accountId: "acc_2", threadId: "t_9", count: 1 }, accounts)).toBe(
      "/u/1/inbox/t_9",
    );
  });

  it("opens the Inbox of the account for a burst of messages", () => {
    expect(mailPushHref({ accountId: "acc_1", threadId: "t_9", count: 3 }, accounts)).toBe(
      "/u/0/inbox",
    );
    expect(mailPushHref({ accountId: "acc_1", threadId: null, count: 1 }, accounts)).toBe(
      "/u/0/inbox",
    );
  });

  it("opens nothing for an account the user no longer has", () => {
    expect(mailPushHref({ accountId: "acc_7", threadId: "t_1", count: 1 }, accounts)).toBeNull();
  });
});
