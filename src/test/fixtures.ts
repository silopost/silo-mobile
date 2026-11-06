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
    desktopNotifications: false,
    updatedAt: null,
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

/** A thread of acc_1 in the Inbox, read, from Jan Kowalski unless overridden. */
export function thread(over: Partial<Schemas["Thread"]>): Schemas["Thread"] {
  return {
    accountId: "acc_1",
    draftId: null,
    hasAttachments: false,
    id: "t_1",
    labelIds: ["INBOX"],
    lastMessageAt: "2025-11-04T08:00:00Z",
    messageCount: 1,
    outboundId: null,
    participants: [{ email: "jan@example.com", name: "Jan Kowalski", unread: false }],
    pendingSync: false,
    scheduledAt: null,
    snippet: "Przesyłam ofertę",
    snoozedUntil: null,
    subject: "Oferta na Q4",
    unreadCount: 0,
    ...over,
  };
}

/** GET /threads page with the given threads. */
export function threadPage(
  threads: Schemas["Thread"][],
  nextCursor: string | null = null,
): Schemas["ThreadList"] {
  return { threads, nextCursor, resultSizeEstimate: threads.length };
}

/** GET /accounts/acc_1/sync-status: live, nothing pending, unless overridden. */
export function syncStatus(over: Partial<Schemas["SyncStatus"]>): Schemas["SyncStatus"] {
  return {
    id: "acc_1",
    email: "ala@example.com",
    state: "live",
    error: null,
    capabilities: [],
    deadOps: 0,
    pendingOps: 0,
    folders: [],
    missingRoles: [],
    keywordsSupported: true,
    lastSyncAt: null,
    initialSyncDoneAt: "2026-11-01T10:00:00Z",
    initialSync: {
      phase: "done",
      messagesDone: 0,
      messagesTotal: 0,
      foldersDone: 0,
      foldersTotal: 0,
      bytesDone: 0,
      bytesTotal: 0,
    },
    ...over,
  };
}

/** A message of thread t_1, read, from Jan Kowalski to the user unless overridden. */
export function message(over: Partial<Schemas["Message"]>): Schemas["Message"] {
  return {
    attachments: [],
    bcc: null,
    bodyState: "full",
    bodyText: "Przesyłam ofertę",
    cc: null,
    date: "2025-11-04T08:00:00Z",
    draftId: null,
    folder: { id: "f_1", name: "INBOX", role: "inbox" },
    from: { email: "jan@example.com", name: "Jan Kowalski" },
    hasHtml: true,
    id: "m_1",
    labelIds: ["INBOX"],
    listUnsubscribe: null,
    pendingSync: false,
    snippet: "Przesyłam ofertę",
    subject: "Oferta na Q4",
    to: [{ email: "ala@example.com", name: "Ala" }],
    ...over,
  };
}

/** GET /threads/{id}: thread t_1 with the given messages. */
export function threadDetail(
  messages: Schemas["Message"][],
  over: Partial<Schemas["ThreadDetail"]> = {},
): Schemas["ThreadDetail"] {
  return {
    accountId: "acc_1",
    id: "t_1",
    labelIds: ["INBOX"],
    subject: "Oferta na Q4",
    messages,
    outboundId: null,
    scheduledAt: null,
    snoozedUntil: null,
    ...over,
  };
}

/** An attachment of a message (a PDF, not inline, downloaded) unless overridden. */
export function attachment(
  over: Partial<Schemas["MessageAttachment"]>,
): Schemas["MessageAttachment"] {
  return {
    contentType: "application/pdf",
    downloaded: true,
    filename: "oferta.pdf",
    id: "a_1",
    inline: false,
    size: 18 * 1024,
    thumbnail: false,
    ...over,
  };
}

/** Draft d_1 of acc_1 at version 1, to Jan unless overridden. */
export function draft(over: Partial<Schemas["Draft"]>): Schemas["Draft"] {
  return {
    id: "d_1",
    accountId: "acc_1",
    threadId: "t_9",
    messageId: "m_d1",
    attachments: null,
    to: [{ email: "jan@example.com", name: "Jan" }],
    cc: null,
    bcc: null,
    subject: "",
    bodyHtml: "",
    bodyJson: null,
    inReplyToMessageId: null,
    lastSend: null,
    serverChanged: false,
    syncedVersion: 0,
    updatedAt: "2026-11-05T10:00:00Z",
    version: 1,
    ...over,
  };
}
