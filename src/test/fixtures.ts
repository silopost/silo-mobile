import type { components } from "../api/schema";

type Schemas = components["schemas"];

export const account: Schemas["Account"] = {
  id: "acc_1",
  email: "ala@example.com",
  displayName: "Ala",
  provider: "generic",
  imapHost: "imap.example.com",
  imapPort: 993,
  imapTls: "implicit",
  smtpHost: "smtp.example.com",
  smtpPort: 465,
  smtpTls: "implicit",
  state: "live",
  error: null,
  lastSyncAt: null,
  position: 0,
  sentAppend: true,
  username: "ala@example.com",
};

/** GET /session (and POST /session without the token). */
export const sessionBody: Schemas["SessionBody"] = {
  user: { id: "u_1", email: "ala@example.com", displayName: "Ala", isAdmin: false },
  csrfToken: "",
  settings: {
    density: "default",
    undoSendSeconds: 5,
    signature: "",
    timezone: "Europe/Warsaw",
    keyboardShortcutsEnabled: true,
    conversationView: true,
    activeAccountId: null,
  },
  accounts: [account],
};

/** A label of acc_1; system INBOX unless overridden. */
export function label(over: Partial<Schemas["Label"]>): Schemas["Label"] {
  return {
    accountId: "acc_1",
    colorBg: null,
    colorText: null,
    folderId: null,
    id: "INBOX",
    keywordState: null,
    name: "INBOX",
    parentId: null,
    position: 0,
    showInList: "show",
    threadsTotal: 0,
    threadsUnread: 0,
    type: "system",
    ...over,
  };
}

/** GET /labels of acc_1: counters on Inbox, Drafts, Scheduled and Spam, two user labels. */
export const labels: Schemas["Label"][] = [
  label({ id: "INBOX", name: "INBOX", threadsUnread: 12, threadsTotal: 340 }),
  label({ id: "STARRED", name: "STARRED", threadsTotal: 4 }),
  label({ id: "DRAFT", name: "DRAFT", threadsTotal: 2 }),
  label({ id: "SCHEDULED", name: "SCHEDULED", threadsTotal: 1 }),
  label({ id: "SPAM", name: "SPAM", threadsUnread: 150, threadsTotal: 150 }),
  label({ id: "l_1", name: "Praca", type: "user", colorBg: "#16a765", threadsUnread: 3 }),
  label({ id: "l_2", name: "Rachunki", type: "user", position: 1 }),
  label({ id: "l_3", name: "Ukryta", type: "user", showInList: "hide", position: 2 }),
];
