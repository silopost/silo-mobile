import type { components } from "../../api/schema";
import { plural } from "../plural";

type AccountState = components["schemas"]["Account"]["state"];

/** A count with English digit grouping ("2,000"): the one number rule of the language. */
const num = (n: number) => n.toLocaleString("en-US");

const n2 = (n: number, one: string, other: string) =>
  `${num(n)} ${plural("en", n, { one, other })}`;

/**
 * UI strings in English, the source language: the type of every other dictionary
 * (messages/pl.ts) is derived from this object, so a missing key is a compile error. Wording
 * follows the Gmail app for Android where it has the same element, silo-web elsewhere.
 */
export const en = {
  appName: "Silo",
  /** Digit grouping of the language, for every number the UI shows (lib/format.ts). */
  formatNumber: num,
  loading: "Loading…",
  retry: "Retry",
  cancel: "Cancel",
  genericError: "Something went wrong. Try again.",
  serverUnreachable: "Can't connect to the server",

  /** date-fns patterns of lib/format.ts (Gmail: "7:31 PM", "Nov 7"). */
  dateFormats: {
    time: "h:mm a",
    dayMonth: "MMM d",
    date: "M/d/yyyy",
    full: "MMM d, yyyy, h:mm a",
  },
  /** End of the spoken label of a list row (Gmail: "… at 7:31 PM", "… on Nov 7"). */
  rowAt: (time: string) => `at ${time}`,
  rowOn: (date: string) => `on ${date}`,
  /** Name of a saved attachment whose own name has no usable character. */
  fileFallback: "file",

  // language
  languageTitle: "Language",

  // login
  loginTitle: "Sign in",
  loginSubtitle:
    "Enter the address of your Silo server and the address and password of your mailbox",
  serverUrl: "Server address",
  invalidServerUrl: "Enter the server address, e.g. https://mail.example.com",
  checkingServer: "Checking the server…",
  serverInfo: (version: string) => `Silo · server ${version}`,
  email: "Email address",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  invalidCredentials: "Wrong email address or password",
  rateLimited: (seconds?: number) =>
    seconds ? `Too many attempts. Try again in ${seconds} s` : "Too many attempts. Try again later",
  mailServerUnavailable: "Mail server unavailable",

  // accounts
  accountStates: {
    connecting: "Connecting",
    discovering: "Finding folders",
    initial_sync: "First sync",
    live: "Up to date",
    backoff: "Server unavailable, retrying soon",
    auth_failed: "Can't sign in to the mailbox",
    disabled: "Disabled",
  } satisfies Record<AccountState, string>,

  // sessions
  sessionsTitle: "Sessions and devices",
  thisDevice: "This device",
  sessionKinds: { bearer: "App", cookie: "Browser" },
  unknownBrowser: "Browser",
  signedInAt: (date: string) => `Signed in: ${date}`,
  lastSeenAt: (date: string) => `Last activity: ${date}`,
  revoke: "Sign out",
  revokeLabel: (name: string) => `Sign out ${name}`,
  revokeTitle: "Sign out the device?",
  revokeBody: (name: string) => `${name} will lose access to your mail until it signs in again.`,
  noSessions: "No other sessions.",
  signOut: "Sign out",
  signingOut: "Signing out…",

  // mail shell: drawer, search bar, account switcher, compose
  mainMenu: "Main menu",
  openMenu: "Open navigation drawer",
  closeDrawer: "Close navigation drawer",
  searchMail: "Search in mail",
  labels: "Labels",
  changeLabels: "Label as",
  folders: "Folders",
  createLabel: "Create label",
  /** Drawer heading above the system views after the Inbox, as in the Gmail app. */
  allLabels: "All labels",
  settings: "Settings",
  helpFeedback: "Help & feedback",
  comingSoon: "Coming soon",
  compose: "Compose",
  unreadCount: (n: number) => `${num(n)} unread`,
  totalCount: (n: number) => n2(n, "conversation", "conversations"),
  accountMenu: (email: string) => `Signed in as ${email}. Account and settings.`,
  switchTo: (email: string) => `Switch to ${email}`,
  addAccount: "Add account",
  manageAccounts: "Manage accounts",
  close: "Close",
  noAccounts: "No mail accounts. Add an account to see your mail.",
  unknownLabel: "Label not found",
  thread: "Conversation",
  themeTitle: "Theme",
  /** Names of the system views of the drawer (lib/labels.ts), as in the Gmail app. */
  views: {
    inbox: "Inbox",
    starred: "Starred",
    snoozed: "Snoozed",
    important: "Important",
    sent: "Sent",
    scheduled: "Scheduled",
    drafts: "Drafts",
    all: "All mail",
    spam: "Spam",
    trash: "Trash",
    archive: "Archive",
  },

  // thread list
  me: "me",
  noSubject: "(no subject)",
  unread: "Unread",
  hasAttachment: "attachment",
  scheduledLabel: "scheduled",
  starredLabel: "starred",
  pendingSync: "Waiting to be saved on the mail server",
  star: "Add star",
  unstar: "Remove star",
  selectThread: "Select conversation",
  deselectThread: "Deselect conversation",
  archive: "Archive",
  trash: "Delete",
  untrash: "Restore from Trash",
  deleteForever: "Delete forever",
  notSpam: "Not spam",
  reportSpam: "Report spam",
  markRead: "Mark read",
  markUnread: "Mark unread",
  moveTo: "Move to",
  selectAll: "Select all",
  moreActions: "More options",
  endSelection: "Done",
  selectedCount: (n: number) => `Selected: ${num(n)}`,
  authFailedBanner: "The mailbox password stopped working",
  updatePassword: "Update password",
  mailServerOffline: (host: string) => `Can't connect to the mail server (${host}).`,
  pendingOps: (n: number) => `${n2(n, "change is", "changes are")} waiting.`,
  retryNow: "Retry now",
  siloOffline: "Can't connect to Silo. Retrying…",
  sendFailedOpen: "Couldn't send",
  open: "Open",
  initialSync: (done: string, total: string) => `Syncing: ${done} of ${total} messages`,
  initialSyncLabel: "First sync progress",
  listError: "Couldn't load the messages",
  tryAgain: "Try again",
  loadingMore: "Loading more messages",
  emptyInbox: "No messages in your Inbox",
  emptySpam: "No spam",
  emptyTrash: "Trash is empty",
  emptyView: "Nothing here",
  messageCount: (n: number) => n2(n, "message", "messages"),
  themes: { system: "System default", light: "Light", dark: "Dark" },

  // thread actions: snackbars, undo, sheets; n = number of conversations
  undo: "Undo",
  ok: "OK",
  create: "Create",
  newLabel: "New label",
  labelName: "Label name",
  labelExists: "A label with this name already exists.",
  labelInvalidParent: "A label can't be nested under itself or under one of its sublabels.",
  labelRefused: "The server rejected the label change.",
  labelDeleted: "Label deleted",
  labelsTitle: "Manage labels",
  labelsHint: "Labels of this account, stored on the mail server as keywords",
  labelsEmpty: "No labels. Create a label in the navigation drawer or here.",
  labelEdit: "Edit label",
  labelColor: "Color",
  labelNoColor: "No color",
  labelColorChoice: (n: number) => `Color ${n}`,
  labelParent: "Nest under",
  labelNoParent: "None (top level)",
  labelShowInList: "Show in the navigation drawer",
  labelShowIfUnread: "When there are unread messages",
  labelCounts: (unread: number, total: number) =>
    unread > 0
      ? `${num(unread)} unread · ${n2(total, "conversation", "conversations")}`
      : n2(total, "conversation", "conversations"),
  labelLocalOnly: "Only on this device – the mail server doesn't support keywords",
  labelPartial: (folders: string) => `Only in Silo in the folders: ${folders}`,
  labelDeleteTitle: (name: string) => `Delete the label "${name}"?`,
  labelDeleteBody:
    "The label and its keyword are removed from the messages on the server. The messages stay.",
  labelSaved: "Label saved",
  labelOnSome: (name: string) => `${name}, on some of the selected conversations`,
  deleteForeverTitle: "Delete forever?",
  deleteForeverBody: (n: number) =>
    `Delete ${n2(n, "conversation", "conversations")} forever? This can't be undone.`,
  /** Names of the fixed places of "Move to", as in Gmail. */
  locations: {
    INBOX: "Inbox",
    SPAM: "Spam",
    TRASH: "Trash",
    ARCHIVE: "Archive",
  } as Record<string, string>,
  currentLocation: "current location",
  done: {
    archive: (n: number) =>
      n === 1 ? "Conversation archived" : `${n2(n, "conversation", "conversations")} archived`,
    trash: (n: number) =>
      n === 1
        ? "Conversation moved to Trash"
        : `${n2(n, "conversation", "conversations")} moved to Trash`,
    untrash: (n: number) =>
      n === 1
        ? "Conversation restored from Trash"
        : `${n2(n, "conversation", "conversations")} restored from Trash`,
    spam: (n: number) =>
      n === 1
        ? "Conversation marked as spam"
        : `${n2(n, "conversation", "conversations")} marked as spam`,
    inbox: (n: number) =>
      n === 1
        ? "Conversation moved to Inbox"
        : `${n2(n, "conversation", "conversations")} moved to Inbox`,
    read: (n: number) =>
      n === 1
        ? "Conversation marked as read"
        : `${n2(n, "conversation", "conversations")} marked as read`,
    unread: (n: number) =>
      n === 1
        ? "Conversation marked as unread"
        : `${n2(n, "conversation", "conversations")} marked as unread`,
    labels: (n: number) =>
      n === 1
        ? "Labels of the conversation changed"
        : `Labels changed: ${n2(n, "conversation", "conversations")}`,
    moved: (n: number, to: string) =>
      n === 1
        ? `Conversation moved to: ${to}`
        : `${n2(n, "conversation", "conversations")} moved to: ${to}`,
    deleted: (n: number) =>
      n === 1
        ? "Conversation deleted forever"
        : `${n2(n, "conversation", "conversations")} deleted forever`,
    snooze: (n: number, when: string) =>
      n === 1
        ? `Snoozed until ${when}`
        : `${n2(n, "conversation", "conversations")} snoozed until ${when}`,
    unsnooze: (n: number) =>
      n === 1
        ? "Conversation moved back to Inbox"
        : `${n2(n, "conversation", "conversations")} moved back to Inbox`,
  },
  undoExpired: "This action can no longer be undone.",

  /** Titles of the confirmations of the device preferences (Gmail: "Delete this message?"). */
  confirmAction: {
    trash: (n: number) =>
      n === 1
        ? "Move the conversation to Trash?"
        : `Move ${n2(n, "conversation", "conversations")} to Trash?`,
    archive: (n: number) =>
      n === 1 ? "Archive the conversation?" : `Archive ${n2(n, "conversation", "conversations")}?`,
  },

  // thread screen
  back: "Navigate up",
  threadNotFound: "Conversation not found",
  moveToInbox: "Move to Inbox",
  important: "Important",
  to: "to",
  toMe: "to me",
  recipients: "Show recipient details",
  from: "From",
  toLabel: "To",
  cc: "Cc",
  date: "Date",
  folded: (n: number) => `Show ${n2(n, "collapsed message", "collapsed messages")}`,
  expandedState: "expanded",
  collapsedState: "collapsed",
  contentLoading: "Fetching the message…",
  contentError: "Message unavailable",
  showImages: "Show images",
  imagesBlocked: "Images in this message are hidden.",
  messageMenu: "More options",
  messageBody: "Message body",
  reply: "Reply",
  replyAll: "Reply all",
  forward: "Forward",
  unreadFromHere: "Mark unread from here",
  draftLabel: "Draft",
  sendingLabel: "Sending…",
  attachmentLabel: (name: string, size: string) => `Attachment ${name}, ${size}`,
  attachmentNotReady: "The attachment isn't downloaded yet. Try again in a moment",
  shareAttachment: "Share or save",
  draftWarnings: {
    quote_unavailable: "Couldn't fetch the original message – the quote has only an excerpt.",
    attachments_unavailable: "Couldn't fetch some attachments of the original.",
    attachments_too_large: "Attachments over the size limit were left out.",
  } as Record<string, string>,
  previewAttachment: (name: string) => `Preview: ${name}`,
  newerLabel: "Newer conversation",
  olderLabel: "Older conversation",
  /** operation.failed by kind (plan 5.4): what the server could not do. */
  operationFailed: (kind: string | undefined, n: number): string => {
    const what = n2(n, "conversation", "conversations");
    const action: Record<string, string> = {
      move: `move ${what}`,
      flags: `change the flags of ${what}`,
      labels: `change the labels of ${what}`,
      expunge: `delete ${what}`,
      append: "save the draft in the Drafts folder",
      delete_draft: "delete the draft from the Drafts folder",
      create_folder: "create the folder",
      delete_folder: "delete the folder",
    };
    const a = kind ? action[kind] : undefined;
    return a
      ? `Couldn't ${a} on the mail server – restored the server's state`
      : `Couldn't change ${what} on the mail server – restored the server's state`;
  },

  // compose. Sizes come formatted (formatSize).
  newMessage: "New message",
  saveAndClose: "Save & close",
  attach: "Attach files",
  attachFile: "Files",
  insertFromGallery: "Photos",
  insertInlineImage: "Insert image in the message",
  send: "Send",
  sending: "Sending…",
  composeMenu: "More options",
  discard: "Discard",
  discardTitle: "Discard draft?",
  discardBody: "The draft will be deleted. This can't be undone.",
  saveDraft: "Save draft",
  bcc: "Bcc",
  subject: "Subject",
  bodyPlaceholder: "Compose email",
  showCcBcc: "Add Cc/Bcc",
  recipientsOf: (field: string) => `Recipients: ${field}`,
  recipientInput: (field: string) => `Add recipients: ${field}`,
  removeRecipient: (who: string) => `Remove ${who}`,
  invalidRecipient: "Invalid address",
  suggestions: "Address suggestions",
  suggestion: (name: string, email: string) => (name ? `${name}, ${email}` : email),
  formatting: "Formatting",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  link: "Insert link",
  quote: "Quote",
  linkUrl: "Link address",
  apply: "Apply",
  removeLink: "Remove link",
  attachments: "Attachments",
  removeAttachment: (name: string) => `Remove attachment ${name}`,
  cancelUpload: (name: string) => `Cancel uploading ${name}`,
  uploading: (name: string) => `Uploading ${name}`,
  saving: "Saving…",
  saved: "Saved",
  saveError: "Couldn't save",
  creatingDraft: "Creating a draft…",
  draftLoadError: "Couldn't load the draft.",
  draftNotSaved: "Couldn't save the draft.",
  draftConflict: "This draft was changed elsewhere",
  draftServerChanged: "Changed in another program",
  reload: "Load",
  overwrite: "Overwrite",
  draftSaved: "Draft saved",
  draftDiscarded: "Draft discarded",
  messageSent: "Sent",
  sendUndone: "Sending undone",
  tooLateToUndo: "Too late, the message has been sent",
  sendFailedIn: (error: string) => `Couldn't send: ${error}`,
  failedRecipients: (list: string) => `Rejected recipients: ${list}`,
  noRecipients: "Add at least one recipient.",
  invalidAddress: "Invalid recipient address. Fix the addresses marked in red.",
  invalidAddressOf: (address: string) =>
    `Invalid recipient address: ${address}. Fix the address marked in red.`,
  messageTooLarge: (limit?: string, size?: string) =>
    limit
      ? `The message with attachments${size ? ` (${size})` : ""} exceeds the ${limit} limit.`
      : "The message with attachments exceeds the server's size limit.",
  smtpError: (detail?: string) =>
    detail
      ? `The mail server rejected the message: ${detail}`
      : "The mail server rejected the message.",
  sendInProgress: "This message is already being sent.",
  uploadsPending: "Wait for the attachments to finish uploading.",
  uploadTooLarge: (name: string, limit?: string) =>
    limit ? `The file ${name} is too large (limit ${limit})` : `The file ${name} is too large`,
  uploadFailed: (name: string) => `Couldn't upload the file ${name}.`,

  // settings (the screens of the Gmail app's settings)
  generalSettings: "General settings",
  aboutApp: "About the app",
  accountSettings: "Account settings",
  settingsSection: (name: string) => `${name}, open`,
  densityTitle: "Conversation list density",
  densities: { default: "Default", comfortable: "Comfortable", compact: "Compact" },
  swipeTitle: "Swipe actions",
  swipeRight: "Right swipe",
  swipeLeft: "Left swipe",
  swipeActions: { archive: "Archive", trash: "Delete", snooze: "Snooze", none: "None" },
  swipeHint: "Configure swipe actions to quickly act on emails in the conversation list",
  confirmTitle: "Action Confirmations",
  confirmBeforeTrash: "Confirm before deleting",
  confirmBeforeArchive: "Confirm before archiving",
  markReadOnOpenTitle: "Mark as read when opened",
  markReadOnOpenOn: "An opened conversation is marked as read",
  markReadOnOpenOff: "An opened conversation stays unread",
  remoteImagesTitle: "Images",
  remoteImages: {
    ask: "Ask before displaying external images",
    always: "Always display external images",
  },
  on: "On",
  off: "Off",
  pushTitle: "Notifications",
  pushUnavailable: {
    loading: "Checking whether the server supports notifications…",
    server: "Unavailable: the server doesn't support push notifications or has them turned off",
    build: "Unavailable: this version of the app was built without push notification settings",
    expoGo: "Unavailable in Expo Go: push notifications need a built app",
  },
  pushNewMail: "Inbox notifications",
  pushOnDescription: "On for this device",
  pushAccounts: "Accounts with notifications",
  pushAllAccounts: "All accounts",
  pushSomeAccounts: (n: number, total: number) => `${n} of ${total}`,
  pushAccountsSave: "Save",
  pushAccountsHint: "Choose the accounts whose new mail you want to be notified about",
  pushPermissionDenied:
    "Notifications aren't allowed. You can allow them in the system settings (Apps → Silo → Notifications).",
  pushServerDisabled: "The server has push notifications turned off.",
  pushInvalidAccount:
    "The server doesn't know one of the chosen accounts. Refresh the account list.",
  pushTokenFailed:
    "Couldn't get the notification ID of this device (Google Play services and internet are needed).",
  pushLastError: (error: string) => `Last delivery error: ${error}`,
  pushChannelName: "New mail",
  pushChannelDescription: "Notifications about new messages in the Inbox",
  localSettingsNote:
    "These settings apply only to this device. Settings shared by all your devices come with a newer server version.",
  generalSectionDisplay: "Display",
  generalSectionActions: "Action Confirmations",
  generalSectionMessages: "Messages",

  // server settings (GET/PATCH /settings)
  syncedSection: "Silo account (synced)",
  syncedNote:
    "These settings are saved on the Silo server and apply on all your devices and in the browser.",
  deviceSettingsNote: 'Settings outside the "Silo account" section apply only to this device.',
  undoSendTitle: "Undo send period",
  undoSendSeconds: (n: number) => `${n} s`,
  signatureTitle: "Signature",
  signatureNone: "Not set",
  signatureHint:
    "The signature is saved on the server (HTML is sanitized). This version doesn't add it to new messages yet.",
  timezoneTitle: "Time zone",
  timezoneHint: "IANA zone name, e.g. Europe/Warsaw",
  timezoneDevice: (zone: string) => `Use the device's zone (${zone})`,
  timezoneDiffers: (zone: string) => `Different from the device's zone (${zone})`,
  timezoneSearch: "Search time zones",
  desktopNotificationsTitle: "Desktop notifications",
  desktopNotificationsNote:
    "A browser setting for Silo on the web; set notifications on this phone under Notifications.",
  invalidSetting: "The server rejected this value.",
  invalidTimezone: "Unknown time zone.",

  // filters (/filters, plan 3.11)
  filtersTitle: "Filters",
  filtersHint: "Filters run on the server for new mail in the Inbox",
  filtersEmpty: "No filters. Add a filter to sort new mail automatically.",
  filterCreate: "Create filter",
  filterEdit: "Edit filter",
  filterName: "Name (optional)",
  filterCriteria: "Criteria",
  filterCriteriaHint: "As in search, e.g. from:shop@example.com has:attachment",
  filterNoCriteria: "Enter the filter criteria.",
  filterTest: "Test search",
  filterActionsTitle: "Actions",
  filterActions: {
    archive: "Skip the Inbox (archive)",
    markRead: "Mark as read",
    star: "Star it",
    important: "Mark as important",
    trash: "Delete it",
  },
  filterAddLabels: "Apply label",
  filterNoLabels: "None",
  filterForwardTo: "Forward to",
  filterForwardHint: "Email address; new mail only",
  filterApplyExisting: "Also apply to existing messages",
  filterEnabled: (name: string) => `Turn on the filter ${name}`,
  filterMoveUp: (name: string) => `Move up: ${name}`,
  filterMoveDown: (name: string) => `Move down: ${name}`,
  filterMenu: (name: string) => `More options of the filter ${name}`,
  filterRemoveTitle: "Delete the filter?",
  filterRemoveBody: (name: string) =>
    `The filter "${name}" stops working. Messages it already changed stay as they are.`,
  filterRemoved: "Filter deleted",
  filterSaved: "Filter saved",
  filterApplying: (n: number | null) =>
    n === null
      ? "Applying the filter…"
      : `Applying the filter… (about ${n2(n, "conversation", "conversations")})`,
  filterApplied: (n: number) => `Filter applied to ${n2(n, "conversation", "conversations")}`,
  filterInvalidQuery: "Invalid criteria – check the search syntax.",
  filterInvalidFilter:
    "The server rejected the filter: choose at least one action, don't combine archive with delete, the criteria can't match all mail, and the forwarding address must be valid.",
  filterInvalidLabel: "The chosen label no longer belongs to this account.",
  filterFromSearch: "Create filter from this search",
  filterSummary: {
    label: (name: string) => `Label: ${name}`,
    forward: (email: string) => `Forward to ${email}`,
  },
  filterDisabled: "Off",

  // account settings
  displayName: "Display name",
  displayNameHint: "The sender name in the messages you send",
  noDisplayName: "Not set",
  save: "Save",
  syncTitle: "Sync",
  syncLive: (when: string | null) => (when ? `Up to date · ${when}` : "Up to date"),
  syncInitial: "First sync",
  syncInitialProgress: (done: string, total: string) => `${done} of ${total} messages`,
  syncBackoff: (host: string) => `Can't connect to the server (${host})`,
  syncAuthFailed: "The password stopped working",
  syncDisabled: "Sync is off",
  syncConnecting: "Connecting to the server…",
  pendingOpsCount: (n: number) => `Pending operations: ${num(n)}`,
  deadOpsCount: (n: number) => `Failed operations: ${num(n)}`,
  deadOpsHint: "Changes that couldn't be saved on the mail server",
  syncNow: "Sync now",
  syncRequested: "Sync started",
  fullCompare: "Full comparison",
  fullCompareHint: "Compares all messages and flags with the server. This may take longer.",
  capabilitiesTitle: "Server capabilities",
  keywordsUnsupported: "Labels only in Silo – the server doesn't support keywords",
  foldersTitle: "Folders",
  folderRoles: {
    inbox: "Inbox",
    sent: "Sent",
    drafts: "Drafts",
    trash: "Trash",
    junk: "Spam",
    archive: "Archive",
    all: "All mail",
    user: "Folder",
  } as Record<string, string>,
  folderMessages: (n: number) => n2(n, "message", "messages"),
  folderIgnored: "not synced",
  serverTitle: "Server",
  incomingServer: "Incoming mail server (IMAP)",
  outgoingServer: "Outgoing mail server (SMTP)",
  tlsModes: { implicit: "TLS", starttls: "STARTTLS", none: "no encryption" },
  serverAddress: (host: string, port: number, tls: string) => `${host}:${port} (${tls})`,
  username: "Username",
  sentAppend: "Save sent mail in the Sent folder",
  sentAppendHint: "Turn on if the server doesn't keep copies of sent messages itself",
  changePassword: "Change password",
  changePasswordHint: "The new mailbox password on the mail server",
  newPassword: "New password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  passwordChanged: "Password changed",
  removeAccount: "Remove account from Silo",
  removeAccountTitle: "Remove the account from Silo?",
  removeAccountBody:
    "Silo deletes the cache and settings of this account. The mailbox on the server stays untouched.",
  remove: "Remove",
  accountRemoved: "Account removed from Silo",
  accountNotFound: "This account doesn't exist",

  // add account
  addAccountTitle: "Add account",
  addAccountIntro: "Add an IMAP/SMTP mailbox. Silo checks the connection before saving it.",
  displayNameOptional: "Display name (optional)",
  advanced: "Advanced settings",
  imapHost: "IMAP server",
  smtpHost: "SMTP server",
  port: "Port",
  security: "Security",
  usernameOptional: "Username (the email address by default)",
  defaultServer: "Account on the default mail server of this Silo instance",
  defaultServerNoCustom: "This Silo instance only allows accounts on its default mail server.",
  testConnection: "Test connection",
  testing: "Testing…",
  add: "Add",
  adding: "Adding…",
  accountAdded: "Account added · First sync in progress",
  testOk: "The connection works",
  testFailed: "The connection doesn't work",
  steps: {
    connect: "Connection",
    tls: "TLS",
    starttls: "STARTTLS",
    ehlo: "EHLO",
    login: "Sign-in",
    auth: "Authentication",
    capability: "Server capabilities",
    list: "Folder list",
  } as Record<string, string>,
  stepOk: "passed",
  stepFailed: "failed",
  requiredEmailPassword: "Enter the email address and password",
  invalidPort: "The port must be a number from 1 to 65535",
  accountErrors: {
    account_test_failed: "Couldn't connect to the account. Check the steps below.",
    account_limit_reached: "The account limit of this Silo server has been reached.",
    account_exists: "This account is already added.",
    custom_servers_disabled: "This instance doesn't allow other mail servers.",
    host_not_allowed: "This mail server isn't allowed.",
    validation_failed: "Invalid account details.",
    upstream_imap_error: "The IMAP server returned an error.",
    upstream_smtp_error: "The SMTP server returned an error.",
    not_found: "This account doesn't exist.",
  } as Record<string, string>,

  // about
  appVersion: "App version",
  apiContract: "API contract",
  serverAddressTitle: "Silo server",
  serverVersion: "Server version",
  apiVersion: "API version",
  authModeTitle: "Sign-in",
  authModes: { imap: "With the mailbox password", local: "With a Silo account" },
  attachmentLimit: "Attachment limit",
  license: "License",
  licenseValue: "AGPL-3.0 · source code",
  sessionsAndDevices: "Sessions and devices",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out all devices?",
  signOutEverywhereBody:
    "All browsers and devices, this one included, will lose access to your mail until they sign in again.",

  // search (the query is parsed by the server, plan 3.12)
  searchBack: "Back",
  clearSearch: "Clear",
  clearSearchText: "Clear search text",
  /** Spoken label of the scrim of a search filter sheet. */
  exitSearchFilter: "Exit search filter",
  searchSubmit: "Search",
  recentSearches: "Recent searches",
  clearAllHistory: "Clear all",
  removeFromHistory: (q: string) => `Remove from history: ${q}`,
  suggestionKinds: {
    history: "Recent search",
    contact: "Contact",
    label: "Label",
    operator: "Operator",
  } as Record<string, string>,
  searchFilters: "Search filters",
  searchChips: {
    labels: "Labels",
    from: "From",
    to: "To",
    subject: "Subject",
    date: "Date",
    attachment: "Attachment",
    unread: "Is unread",
    starred: "Starred",
  },
  chipFromTitle: "From",
  chipToTitle: "To",
  chipAddressHint: "Type a name or email",
  chipSubjectTitle: "Subject",
  chipSubjectHint: "Words in the subject",
  chipApply: "Apply",
  dateChipTitle: "Date",
  dateOptions: {
    older_than_1w: "Older than a week",
    older_than_1m: "Older than a month",
    older_than_6m: "Older than 6 months",
    older_than_1y: "Older than a year",
    newer_than_7d: "Last 7 days",
    newer_than_30d: "Last 30 days",
  } as Record<string, string>,
  dateAfter: "After…",
  dateBefore: "Before…",
  resultCount: (n: number) => (n === 0 ? "No results" : `About ${n2(n, "result", "results")}`),
  emptySearch: "No messages matched your search",
  approximate: "Approximate results – the search took too long",
  indexing: (pct: number) => `Indexing in progress (${pct}%) – results may be incomplete`,
  invalidQuery: "Invalid query",

  // snooze (plan 3.10)
  today: "today",
  tomorrow: "tomorrow",
  snooze: "Snooze",
  snoozeTitle: "Snooze until…",
  snoozePresets: {
    later_today: "Later today",
    tomorrow: "Tomorrow",
    this_weekend: "This weekend",
    next_week: "Next week",
  } as Record<string, string>,
  pickDateTime: "Pick date & time",
  unsnooze: "Unsnooze",
  snoozedUntil: (when: string) => `Snoozed until ${when}`,
  snoozeNotInInbox: "Only conversations in the Inbox can be snoozed.",
  snoozeInvalid: "Pick a time from 30 seconds to a year from now.",
  notSnoozed: "This conversation is no longer snoozed.",

  // scheduled send (plan 3.9)
  scheduleSend: "Schedule send",
  schedulePresets: {
    tomorrowMorning: "Tomorrow morning",
    tomorrowAfternoon: "Tomorrow afternoon",
    mondayMorning: "Monday morning",
  },
  scheduledFor: (when: string) => `Scheduled for ${when}`,
  scheduledAt: (when: string) => `Scheduled: ${when}`,
  cancelSend: "Cancel send",
  sendCancelled: "Send cancelled – the message is back in Drafts",
};

export type Messages = typeof en;
