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
