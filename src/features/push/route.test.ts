import { mailPushHref, parseMailPush } from "./route";

const accounts = [
  { id: "acc_1", position: 0 },
  { id: "acc_2", position: 1 },
];

describe("parseMailPush", () => {
  it("reads a version 1 mail push", () => {
    expect(
      parseMailPush({ v: 1, type: "mail", accountId: "acc_2", threadId: "t_9", count: 1 }),
    ).toEqual({ accountId: "acc_2", threadId: "t_9", count: 1 });
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
