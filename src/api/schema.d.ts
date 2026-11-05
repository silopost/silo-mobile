/**
 * GENERATED FILE, DO NOT EDIT.
 * Source: silo-server api/openapi.yaml
 * Regenerate with `npm run gen:api` (see README, "API contract").
 */

export interface paths {
    "/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the accounts of the user with their sync state */
        get: operations["listAccounts"];
        put?: never;
        /**
         * Add an account
         * @description Runs the connection test first; a failure answers 422 account_test_failed with the steps in `test`.
         */
        post: operations["createAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Test a connection without saving
         * @description Runs IMAP (connect, tls, login, capability, list) and SMTP (connect, ehlo, starttls, auth) checks and reports each step; nothing is sent or stored. The response is 200 even when a step fails: inspect `ok` per protocol.
         */
        post: operations["testAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Remove an account from Silo
         * @description Deletes the account and everything cached for it. The mail server is not touched.
         */
        delete: operations["deleteAccount"];
        options?: never;
        head?: never;
        /** Change account settings */
        patch: operations["updateAccount"];
        trace?: never;
    };
    "/accounts/{id}/folders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the server folders of an account with roles and sync mode */
        get: operations["listFolders"];
        /**
         * Map folder roles and choose which folders are synced
         * @description Listed folders get the given role and/or sync mode; others stay unchanged. Each role except user belongs to at most one folder and INBOX cannot be changed (422 validation_failed).
         */
        put: operations["updateFolders"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{id}/resync": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Force a sync of the account
         * @description Queues the request for the account's sync worker and returns at once.
         */
        post: operations["resyncAccount"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{id}/sync-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the sync state of an account
         * @description State machine, initial sync progress, pending operations, folders and their errors, and roles still missing on the server.
         */
        get: operations["getSyncStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/attachments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Attachment bytes
         * @description A download; with inline=1 images are shown in the browser. An attachment that was not downloaded yet is fetched from the mail server together with its message (same wait and 503 as /messages/{id}/html).
         */
        get: operations["getAttachment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/contacts/autocomplete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Suggest recipients
         * @description Up to 8 addresses of the user whose address, name or a word of the name starts with q (case-insensitive): the most written to first, then the most recent. Learnt from received and sent mail.
         */
        get: operations["autocompleteContacts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/drafts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Start a draft
         * @description Creates a draft with the DRAFT label: a new message, or with replyToMessageId a reply (reply: the sender or Reply-To; replyAll: also the other recipients without the account) in the thread of that message, or a forward (new thread). Subject (Re:/Fwd:) and quoted body are prefilled. Nothing reaches the mail server before the first PUT.
         */
        post: operations["createDraft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/drafts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a draft
         * @description The draft as last saved. The d_ id of a draft equals the m_ id of its message, so a message with the DRAFT label written in another program opens as d_<same id>: its content is read from the server (503 content_not_available while unreachable) and later saves replace it there.
         */
        get: operations["getDraft"];
        /**
         * Save a draft (autosave)
         * @description Replaces the editable fields. version must be the version the client edited, else 409 draft_version_conflict (another window saved meanwhile). The draft and its thread are updated at once (thread.updated, draft.updated); the copy in the server's Drafts folder follows at least 30 s after the last save (right away with syncNow, when the compose window closes), always as exactly one message. The 409 carries currentVersion and current (the draft as saved meanwhile). An invalid address is 400 validation_failed with address and field.
         */
        put: operations["updateDraft"];
        post?: never;
        /**
         * Discard a draft
         * @description Deletes the draft and its message in Silo at once; its copy in the server's Drafts folder is removed by a queued operation.
         */
        delete: operations["deleteDraft"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/drafts/{id}/send": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a draft
         * @description Queues the draft as last saved (save it first). The message is built at once (Bcc only in the envelope) and labelled SCHEDULED; it leaves undoSendSeconds (5, 10, 20 or 30; 5 by default) later, or at sendAt. Until undoUntil, POST /outbound/{id}/cancel brings the draft back. After sending: SENT, a copy in the Sent folder (when the account's sentAppend is on; otherwise the server's own copy is matched by Message-ID), \Answered or $Forwarded on the original, the copy in Drafts removed. Delivery problems are retried (30 s, 2 min, 10 min, 30 min); a refusal fails the send at once and the message is a draft again (outbound.status event with error). 422 no_recipients / invalid_address, 413 message_too_large (over SILO_MAX_ATTACHMENT_BYTES; the SMTP server's SIZE is checked when sending), 409 send_in_progress.
         */
        post: operations["sendDraft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Server-Sent Events stream
         * @description Pushes changes of the mailbox as they are committed. After a reconnect with Last-Event-ID the missed events (24 h retained) are replayed first; an id older than the retention yields a resync event. A ': ping' comment is sent every 25 s. A client that cannot keep up is disconnected and replays on reconnect.
         */
        get: operations["streamEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/events/poll": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Events after a sequence number (fallback for /events)
         * @description The same events as the stream, for clients whose EventSource keeps failing. An after older than the 24 h retention answers a single resync event.
         */
        get: operations["pollEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/labels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the labels of an account with thread counters
         * @description System labels (plus the pseudo label UNREAD), folder labels and user labels, with threadsTotal and threadsUnread (threads with unread mail).
         */
        get: operations["listLabels"];
        put?: never;
        /**
         * Create a label or a folder
         * @description type user creates a label locally and assigns its IMAP keyword; type folder creates the folder on the mail server (CREATE, queued) and its folder label at once.
         */
        post: operations["createLabel"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/labels/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete a label or an empty folder
         * @description A user label is removed and its keyword taken off the messages (queued). A folder must be empty; it is deleted on the mail server (queued) and disappears from the labels after the next discovery. System labels answer 400.
         */
        delete: operations["deleteLabel"];
        options?: never;
        head?: never;
        /**
         * Rename, recolour or hide a label
         * @description Renaming a user label gives it a new IMAP keyword and moves its messages to it on the server (queued). System labels and folders cannot be renamed (400).
         */
        patch: operations["updateLabel"];
        trace?: never;
    };
    "/messages/modify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add or remove labels on single messages
         * @description Changes labels in the Gmail model: the change is visible at once (pendingSync: true) and written back to the mail server by a queued operation. Folder changes (INBOX, TRASH, SPAM, folder labels) wait for the undo window; flags (UNREAD, STARRED, IMPORTANT, user labels as keywords) are sent at once. SENT, DRAFT, SNOOZED, SCHEDULED and ARCHIVE cannot be changed directly (400).
         */
        post: operations["modifyMessages"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messages/{id}/html": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Sanitised HTML of a message
         * @description The text/html part with scripts, event handlers, active URLs, forms, frames and @import removed; cid: images point to /attachments/{id}?inline=1; remote images are left in. A message that has only text is returned as a preformatted block. When the body is not in the mirror yet (bodyState headers or deferred) it is downloaded from the mail server first, waiting up to 10 s; then 503 content_not_available with Retry-After. The response is immutable and cacheable. It carries a Content-Security-Policy.
         */
        get: operations["getMessageHtml"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/messages/{id}/raw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Original message (.eml)
         * @description The message exactly as the mail server delivered it (message/rfc822), downloaded first when it is not in the mirror yet.
         */
        get: operations["getMessageRaw"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/meta": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get server metadata
         * @description Public endpoint: versions and instance settings needed before signing in.
         */
        get: operations["getMeta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/operations/{id}/undo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Undo an operation
         * @description Until undoUntil (while its jobs still wait) the operation is cancelled: the jobs are deleted and the threads return to the state of the mail server in the same transaction, so the server never sees the operation; operationId and undoUntil of the answer are null. Later (the operation is being sent or was executed, e.g. flag changes, which are sent at once) the server applies the inverse itself: messages go back to the folders they came from, flags and user labels that the operation changed are changed back. That is a new operation, with its own operationId and undoUntil, which can be undone in turn. Either way the answer is the threads after the undo and the usual thread.updated events (with origin) are written. An operation can be undone once, for 24 hours; later 409 undo_expired. A permanent delete (/threads/delete) can only be undone inside its window, later 409 operation_not_undoable. An unknown operation, or one of another user, is 404.
         */
        post: operations["undoOperation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/outbound/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Undo send
         * @description Cancels a queued send (undo send, or a scheduled send) before it leaves: nothing reaches the SMTP server and the message is the draft it was (same content and version), returned for the compose window. A send already being delivered or delivered is 409 send_in_progress; a cancelled or failed one returns its draft.
         */
        post: operations["cancelOutbound"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the current session */
        get: operations["getSession"];
        put?: never;
        /**
         * Sign in
         * @description In imap mode the credentials are verified with LOGIN on the default mail server. A new user and first account are created on first success. When the mail server is unreachable, a known user with the right password is let in and the account reports state `backoff`. Every failure answers 401 invalid_credentials after a constant minimum time. Browsers get the silo_session cookie; with client.kind=bearer (native clients) no cookie is set and the body carries a token for the Authorization: Bearer header instead (shown once).
         */
        post: operations["login"];
        /** Sign out */
        delete: operations["logout"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the sessions of the user */
        get: operations["listSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Revoke a session */
        delete: operations["revokeSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List threads of a label (or all mail), newest first
         * @description Keyset pagination: the cost does not depend on the page number. Threads entirely in Trash or Spam are left out of the all-mail view. q is a plain full-text query over subject, sender, recipients, attachment names and downloaded body text.
         */
        get: operations["listThreads"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Delete threads for good
         * @description Only the messages in Trash or Spam are deleted (\Deleted + UID EXPUNGE on the server); threads without such messages answer 400.
         */
        post: operations["deleteThreads"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads/modify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Add or remove labels on threads
         * @description Changes labels in the Gmail model: the change is visible at once (pendingSync: true) and written back to the mail server by a queued operation. Folder changes (INBOX, TRASH, SPAM, folder labels) wait for the undo window; flags (UNREAD, STARRED, IMPORTANT, user labels as keywords) are sent at once. SENT, DRAFT, SNOOZED, SCHEDULED and ARCHIVE cannot be changed directly (400).
         */
        post: operations["modifyThreads"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads/trash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Move threads to the trash
         * @description Same as modify with addLabelIds [TRASH]; the folder each message came from is kept for untrash.
         */
        post: operations["trashThreads"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads/untrash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Restore threads from the trash
         * @description Same as modify with removeLabelIds [TRASH]: messages go back to their folder (INBOX when unknown).
         */
        post: operations["untrashThreads"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/threads/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a thread with its messages
         * @description Messages in date order with the text of the body when it is downloaded. Opening a thread does not mark it as read; the client sends modify removeLabelIds [UNREAD].
         */
        get: operations["getThread"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/uploads": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload a draft attachment
         * @description multipart/form-data with one file part (any field name). The file is streamed to the blob store; its id goes to attachmentIds of PUT /drafts/{id}. Uploads not attached to a draft are deleted after 24 h. A file over the instance limit (SILO_MAX_ATTACHMENT_BYTES, 25 MB by default) is 413 upload_too_large.
         */
        post: operations["uploadAttachment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Account: {
            displayName: string;
            email: string;
            error: string | null;
            /** @example acc_1 */
            id: string;
            imapHost: string;
            /** Format: int64 */
            imapPort: number;
            /** @enum {string} */
            imapTls: "implicit" | "starttls" | "none";
            /** Format: date-time */
            lastSyncAt: string | null;
            /**
             * Format: int64
             * @description Order of the account among the user's accounts (0 first); account lists are sorted by it. silo-web maps /u/<n> to the n-th account.
             */
            position: number;
            /** @enum {string} */
            provider: "generic" | "gmail" | "microsoft";
            /** @description Whether Silo copies sent messages to the Sent folder itself (servers that do not). */
            sentAppend: boolean;
            smtpHost: string;
            /** Format: int64 */
            smtpPort: number;
            /** @enum {string} */
            smtpTls: "implicit" | "starttls" | "none";
            /**
             * @description Sync state; backoff means the mail server is unreachable.
             * @enum {string}
             */
            state: "connecting" | "discovering" | "initial_sync" | "live" | "backoff" | "auth_failed" | "disabled";
            username: string;
        };
        AccountsOutputBody: {
            accounts: components["schemas"]["Account"][] | null;
        };
        Address: {
            email: string;
            name: string;
        };
        ConnectionParams: {
            /** @description Sender address. */
            email?: string;
            /** @description Defaults to the default server of the instance. */
            imapHost?: string;
            /** Format: int64 */
            imapPort?: number;
            /** @enum {string} */
            imapTls?: "implicit" | "starttls" | "none";
            password: string;
            smtpHost?: string;
            /** Format: int64 */
            smtpPort?: number;
            /** @enum {string} */
            smtpTls?: "implicit" | "starttls" | "none";
            /** @description Login name; defaults to email. */
            username?: string;
        };
        ContactSuggestion: {
            /** @example jan@firma.pl */
            email: string;
            /** @example Jan Kowalski */
            name: string;
        };
        ContactSuggestions: {
            contacts: components["schemas"]["ContactSuggestion"][] | null;
        };
        CreateAccount: {
            displayName?: string;
            /** @description Sender address. */
            email?: string;
            /** @description Defaults to the default server of the instance. */
            imapHost?: string;
            /** Format: int64 */
            imapPort?: number;
            /** @enum {string} */
            imapTls?: "implicit" | "starttls" | "none";
            password: string;
            smtpHost?: string;
            /** Format: int64 */
            smtpPort?: number;
            /** @enum {string} */
            smtpTls?: "implicit" | "starttls" | "none";
            /** @description Login name; defaults to email. */
            username?: string;
        };
        CreateDraftBody: {
            /** @description Account of a new message; the active account when omitted. Ignored for replies (the account of the message replied to). */
            accountId?: string;
            /**
             * @description With replyToMessageId; reply when omitted.
             * @enum {string}
             */
            mode?: "reply" | "replyAll" | "forward";
            /** @description m_ id of the message to reply to or forward. */
            replyToMessageId?: string;
        };
        CreateLabelBody: {
            /** @description Account; the active account when omitted. */
            accountId?: string;
            colorBg?: string;
            colorText?: string;
            name: string;
            parentId?: string;
            /**
             * @description user: a label (IMAP keyword); folder: a server folder (CREATE).
             * @enum {string}
             */
            type: "user" | "folder";
        };
        Draft: {
            /** @example acc_1 */
            accountId: string;
            attachments: components["schemas"]["UploadInfo"][] | null;
            bcc: components["schemas"]["Address"][] | null;
            bodyHtml: string;
            /** @description Editor document (TipTap JSON) stored as given; null when never set. */
            bodyJson: unknown;
            cc: components["schemas"]["Address"][] | null;
            /**
             * @description Draft id; the draft's local message is messageId.
             * @example d_4k2
             */
            id: string;
            /** @description m_ id of the message replied to or forwarded. */
            inReplyToMessageId: string | null;
            /** @description The last send of this draft when it failed (it is a draft again); null otherwise. Kept until the next send, so a failure is still visible after a reload. */
            lastSend: components["schemas"]["LastSend"];
            /** @example m_4k2 */
            messageId: string;
            /** @description The copy in the server's Drafts folder was changed or removed by another program since Silo saved it. */
            serverChanged: boolean;
            subject: string;
            /**
             * Format: int32
             * @description Version saved in the Drafts folder of the mail server (0: not yet). Saves reach the server at least 30 s after the last change.
             */
            syncedVersion: number;
            /** @example t_8f3k2 */
            threadId: string;
            to: components["schemas"]["Address"][] | null;
            /** Format: date-time */
            updatedAt: string;
            /**
             * Format: int32
             * @description Send it back with PUT; it grows with every save.
             */
            version: number;
        };
        ErrorDetail: {
            /** @description Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id' */
            location?: string;
            /** @description Error message text */
            message?: string;
            /** @description The value at the given location */
            value?: unknown;
        };
        Folder: {
            error: string | null;
            /** Format: int64 */
            errorCount: number;
            /** @example f_3 */
            id: string;
            /** Format: date-time */
            lastSyncAt: string | null;
            /** Format: int64 */
            messages: number;
            /** @example INBOX */
            name: string;
            /** @enum {string} */
            role: "inbox" | "sent" | "drafts" | "trash" | "junk" | "archive" | "all" | "user";
            /** @description RFC 6154 attribute reported by the server, e.g. \Sent. */
            specialUse: string | null;
            /** @enum {string} */
            syncMode: "sync" | "ignore";
            /** Format: int64 */
            unread: number;
        };
        FolderChange: {
            /** @example f_3 */
            id: string;
            /**
             * @description Manual role; wins over SPECIAL-USE and names. One folder per role.
             * @enum {string}
             */
            role?: "sent" | "drafts" | "trash" | "junk" | "archive" | "all" | "user";
            /**
             * @description ignore removes the folder from the mirror.
             * @enum {string}
             */
            syncMode?: "sync" | "ignore";
        };
        FoldersOutputBody: {
            folders: components["schemas"]["Folder"][] | null;
        };
        IDsBody: {
            ids: string[] | null;
        };
        Label: {
            /** @example acc_1 */
            accountId: string;
            colorBg: string | null;
            colorText: string | null;
            /** @description Folder labels: the f_ id of the server folder. */
            folderId: string | null;
            /**
             * @description The key (INBOX, STARRED, ..., UNREAD) for system labels, l_ id otherwise.
             * @example l_7
             */
            id: string;
            /**
             * @description User labels only: mirrored when the label is an IMAP keyword on the server, local_only when the server keeps no keywords.
             * @enum {string|null}
             */
            keywordState: "mirrored" | "local_only" | null;
            name: string;
            parentId: string | null;
            /** Format: int64 */
            position: number;
            /** @enum {string} */
            showInList: "show" | "hide" | "show_if_unread";
            /** Format: int64 */
            threadsTotal: number;
            /** Format: int64 */
            threadsUnread: number;
            /** @enum {string} */
            type: "system" | "folder" | "user";
        };
        LabelsOutputBody: {
            labels: components["schemas"]["Label"][] | null;
        };
        LastSend: {
            /** @description Reply of the SMTP server or the connection error; interrupted: the server restarted during delivery (the message may have left; send it again only after checking Sent). */
            error: string;
            /** @description Recipients refused by the SMTP server. */
            failedRecipients: string[] | null;
            /** @example ob_9 */
            outboundId: string;
            /**
             * @description Only failed for now; a cancelled send (undo send) is not reported.
             * @enum {string}
             */
            status: "failed";
            /** Format: date-time */
            updatedAt: string;
        } | null;
        LoginClient: {
            /**
             * @description bearer: native client; the token is returned in the body and no cookie is set.
             * @enum {string}
             */
            kind: "cookie" | "bearer";
            /** @description Device name shown in the session list, e.g. "Pixel 8". */
            name?: string;
        };
        LoginInputBody: {
            /** @description Kind of session to open; a browser cookie session when omitted. */
            client?: components["schemas"]["LoginClient"];
            /** @description Mailbox address (or local part, per SILO_DEFAULT_LOGIN_FORMAT). */
            email: string;
            password: string;
        };
        Message: {
            attachments: components["schemas"]["MessageAttachment"][] | null;
            bcc: components["schemas"]["Address"][] | null;
            /**
             * @description headers: only the headers are in the mirror; GET /messages/{id}/html downloads the body.
             * @enum {string}
             */
            bodyState: "headers" | "full" | "deferred" | "local";
            bodyText: string;
            cc: components["schemas"]["Address"][] | null;
            /** Format: date-time */
            date: string;
            /**
             * @description d_ id for GET/PUT /drafts/{id} when the message is a draft (DRAFT label; also one written in another program); null otherwise.
             * @example d_1x9
             */
            draftId: string | null;
            folder: components["schemas"]["MessageFolder"];
            from: components["schemas"]["Address"];
            /** @description A text/html part exists; known once the body is downloaded. */
            hasHtml: boolean;
            /** @example m_1x9 */
            id: string;
            labelIds: string[] | null;
            listUnsubscribe: string | null;
            pendingSync: boolean;
            /** @description Reply-To of the message; absent without one. */
            replyTo?: components["schemas"]["Address"];
            snippet: string;
            subject: string;
            to: components["schemas"]["Address"][] | null;
        };
        MessageAttachment: {
            contentType: string;
            /** @description false: the bytes are fetched from the mail server on first download. */
            downloaded: boolean;
            filename: string;
            /** @example a_44 */
            id: string;
            inline: boolean;
            /** Format: int64 */
            size: number;
        };
        MessageFolder: {
            /** @example f_3 */
            id: string;
            name: string;
            role: string;
        } | null;
        Meta: {
            /** @description Whether users may add accounts on arbitrary IMAP/SMTP hosts. */
            allowCustomServers: boolean;
            /**
             * @description Major version of the REST API.
             * @example 1
             */
            apiVersion: string;
            /**
             * @description How users sign in: with their mailbox credentials (imap) or Silo accounts (local).
             * @enum {string}
             */
            authMode: "imap" | "local";
            /**
             * Format: int64
             * @description Limit in bytes of one upload and of a sent message with its attachments (SILO_MAX_ATTACHMENT_BYTES); larger ones are 413 upload_too_large / message_too_large.
             * @example 26214400
             */
            maxAttachmentBytes: number;
            /**
             * @description Oldest silo-web release this server supports.
             * @example 0.3.0
             */
            minWebVersion: string;
            /**
             * @description Version of silo-server.
             * @example 0.3.0
             */
            serverVersion: string;
        };
        ModifyBody: {
            addLabelIds?: string[] | null;
            /** @description t_ ids (threads/modify) or m_ ids (messages/modify). */
            ids: string[] | null;
            removeLabelIds?: string[] | null;
        };
        OperationResult: {
            /** @description Id of the operation (undo); null when nothing had to be sent to the server. */
            operationId: string | null;
            threads: components["schemas"]["Thread"][] | null;
            /**
             * Format: date-time
             * @description End of the undo window of folder operations; null for flag-only changes.
             */
            undoUntil: string | null;
        };
        Participant: {
            email: string;
            name: string;
            unread: boolean;
        };
        PatchAccount: {
            displayName?: string;
            /** Format: int64 */
            imapPort?: number;
            /** @enum {string} */
            imapTls?: "implicit" | "starttls" | "none";
            password?: string;
            sentAppend?: boolean;
            /** Format: int64 */
            smtpPort?: number;
            /** @enum {string} */
            smtpTls?: "implicit" | "starttls" | "none";
        };
        PollResult: {
            /** @description After a resync event, discard cached data and refetch. */
            events: components["schemas"]["PolledEvent"][] | null;
            /**
             * Format: int64
             * @description Pass as after in the next poll.
             */
            nextAfter: number;
        };
        PolledEvent: {
            data: {
                [key: string]: unknown;
            };
            /** Format: int64 */
            id: number;
            type: string;
        };
        Problem: {
            /** @description invalid_address (and validation_failed of a draft save): the refused address as given. */
            address?: string;
            /** @description Stable machine-readable error code. */
            code?: string;
            /** @description draft_version_conflict: the draft as saved meanwhile (as GET /drafts/{id}), so that the client needs no extra request. */
            current?: components["schemas"]["Draft"];
            /**
             * Format: int32
             * @description draft_version_conflict: the version saved meanwhile.
             */
            currentVersion?: number;
            /** @description Explanation specific to this occurrence. */
            detail?: string;
            /** @description Individual validation errors. */
            errors?: components["schemas"]["ErrorDetail"][] | null;
            /**
             * @description invalid_address (and validation_failed of a draft save): the recipient field of address.
             * @enum {string}
             */
            field?: "to" | "cc" | "bcc";
            /**
             * Format: int64
             * @description upload_too_large, message_too_large: the limit in bytes (SILO_MAX_ATTACHMENT_BYTES).
             */
            limit?: number;
            /**
             * Format: int64
             * @description upload_too_large, message_too_large: size in bytes of what was refused (for an upload: the request's Content-Length when sent, including the multipart framing).
             */
            size?: number;
            /**
             * Format: int64
             * @description HTTP status code.
             */
            status?: number;
            /** @description Per-step result, present for account_test_failed. */
            test?: components["schemas"]["TestResult"];
            /** @description Short summary of the HTTP status. */
            title?: string;
            /**
             * Format: uri
             * @description URI identifying the error type.
             */
            type?: string;
        };
        ProtocolResult: {
            ok: boolean;
            steps: components["schemas"]["Step"][] | null;
        };
        PutFoldersInputBody: {
            folders: components["schemas"]["FolderChange"][] | null;
        };
        Recipient: {
            email: string;
            name?: string;
        };
        Resync: {
            /**
             * @description incremental: sync all folders now; full: also compare every flag; rebuild: drop and rebuild the cache (not implemented yet, 501).
             * @default incremental
             * @enum {string}
             */
            mode: "incremental" | "full" | "rebuild";
        };
        SendDraftBody: {
            /**
             * Format: date-time
             * @description Schedule the send (at most a year ahead). Omitted or earlier than the end of the undo window: the message leaves when the window ends.
             */
            sendAt?: string;
        };
        SendResult: {
            /**
             * @description The message, labelled SCHEDULED until it is sent, then SENT.
             * @example m_4k2
             */
            messageId: string;
            /**
             * @description For POST /outbound/{id}/cancel and the outbound.status events.
             * @example ob_9
             */
            outboundId: string;
            /**
             * Format: date-time
             * @description The message leaves at this time; until then it can be cancelled.
             */
            undoUntil: string;
        };
        SessionBody: {
            accounts: components["schemas"]["Account"][] | null;
            /** @description Send as X-Silo-CSRF on every mutating request (cookie sessions only). */
            csrfToken: string;
            settings: components["schemas"]["Settings"];
            /** @description Bearer token of a session opened with client.kind=bearer; returned once, by POST /session only. */
            token?: string;
            user: components["schemas"]["User"];
        };
        SessionInfo: {
            /** @description Device name given by a native client at sign-in; empty for browsers. */
            clientName: string;
            /** Format: date-time */
            createdAt: string;
            /** @description Whether this is the session making the request. */
            current: boolean;
            /** Format: date-time */
            expiresAt: string;
            /** @example s_3k */
            id: string;
            ip: string | null;
            /**
             * @description cookie: browser session; bearer: native client token.
             * @enum {string}
             */
            kind: "cookie" | "bearer";
            /** Format: date-time */
            lastSeenAt: string;
            userAgent: string;
        };
        SessionsOutputBody: {
            sessions: components["schemas"]["SessionInfo"][] | null;
        };
        Settings: {
            /** @description Account shown by default; the first account when unset. */
            activeAccountId: string | null;
            conversationView: boolean;
            /** @enum {string} */
            density: "default" | "comfortable" | "compact";
            keyboardShortcutsEnabled: boolean;
            signature: string;
            /**
             * @description IANA time zone name.
             * @example Europe/Warsaw
             */
            timezone: string;
            /**
             * Format: int64
             * @description Delay before a sent message leaves, in seconds.
             */
            undoSendSeconds: number;
        };
        Step: {
            /** @description Server capabilities or the reason the stage failed. */
            detail?: string;
            /**
             * Format: int64
             * @description Duration of the stage in milliseconds.
             */
            ms: number;
            ok: boolean;
            /** @description Stage name: connect, tls, starttls, ehlo, login, auth, capability, list. */
            step: string;
        };
        SyncProgress: {
            /** Format: int64 */
            bytesDone: number;
            /** Format: int64 */
            bytesTotal: number;
            /** Format: int64 */
            foldersDone: number;
            /** Format: int64 */
            foldersTotal: number;
            /** Format: int64 */
            messagesDone: number;
            /** Format: int64 */
            messagesTotal: number;
            /**
             * @description headers_recent: last 30 days of INBOX and Sent (phase A); headers: header backfill; bodies: body backfill; done.
             * @enum {string}
             */
            phase: "headers_recent" | "headers" | "bodies" | "done";
        };
        SyncStatus: {
            capabilities: string[] | null;
            /**
             * Format: int64
             * @description Jobs of the account that failed for good.
             */
            deadOps: number;
            email: string;
            error: string | null;
            folders: components["schemas"]["Folder"][] | null;
            /** @example acc_1 */
            id: string;
            initialSync: components["schemas"]["SyncProgress"];
            /** Format: date-time */
            initialSyncDoneAt: string | null;
            keywordsSupported: boolean;
            /** Format: date-time */
            lastSyncAt: string | null;
            /** @description Roles without a folder on the server (archive: created on the first archive operation). */
            missingRoles: string[] | null;
            /**
             * Format: int64
             * @description Local operations waiting for write-back.
             */
            pendingOps: number;
            /** @enum {string} */
            state: "connecting" | "discovering" | "initial_sync" | "live" | "backoff" | "auth_failed" | "disabled";
        };
        TestResult: {
            imap: components["schemas"]["ProtocolResult"];
            smtp: components["schemas"]["ProtocolResult"];
        };
        Thread: {
            /** @example acc_1 */
            accountId: string;
            /**
             * @description d_ id of the newest draft in the thread (a message with the DRAFT label), for opening it in compose; null without one.
             * @example d_4k2
             */
            draftId: string | null;
            hasAttachments: boolean;
            /** @example t_8f3k2 */
            id: string;
            /** @description System labels (INBOX, STARRED, ..., UNREAD) and l_ ids of user/folder labels. */
            labelIds: string[] | null;
            /** Format: date-time */
            lastMessageAt: string;
            /** Format: int64 */
            messageCount: number;
            participants: components["schemas"]["Participant"][] | null;
            /** @description Local changes still waiting for the mail server. */
            pendingSync: boolean;
            snippet: string;
            /** Format: date-time */
            snoozedUntil: string | null;
            subject: string;
            /** Format: int64 */
            unreadCount: number;
        };
        ThreadDetail: {
            accountId: string;
            /** @example t_8f3k2 */
            id: string;
            labelIds: string[] | null;
            messages: components["schemas"]["Message"][] | null;
            subject: string;
        };
        ThreadList: {
            /** @description Opaque; pass it as cursor for the next page. null on the last page. */
            nextCursor: string | null;
            /**
             * Format: int64
             * @description Threads in the view (exact for a label, an estimate otherwise).
             */
            resultSizeEstimate: number;
            threads: components["schemas"]["Thread"][] | null;
        };
        UpdateDraftBody: {
            /** @description u_ ids of uploads to attach; uploads left out are detached. */
            attachmentIds?: string[] | null;
            bcc?: components["schemas"]["Recipient"][] | null;
            bodyHtml: string;
            /** @description Editor document (TipTap JSON), stored as given. */
            bodyJson?: unknown;
            cc?: components["schemas"]["Recipient"][] | null;
            subject: string;
            /** @description Save the copy in the server's Drafts folder right away instead of 30 s after the last change: the last save when the compose window closes (plan 3.8 step 2). */
            syncNow?: boolean;
            to: components["schemas"]["Recipient"][] | null;
            /**
             * Format: int32
             * @description Version the client edited (from the last GET/PUT); another save meanwhile is 409 draft_version_conflict.
             */
            version: number;
        };
        UpdateLabelBody: {
            /** @description Empty string clears the colour. */
            colorBg?: string;
            colorText?: string;
            /** @description User labels only. */
            name?: string;
            /** @enum {string} */
            showInList?: "show" | "hide" | "show_if_unread";
        };
        UploadInfo: {
            /** @example application/pdf */
            contentType: string;
            /** @example umowa.pdf */
            filename: string;
            /** @example u_91 */
            id: string;
            /**
             * Format: int64
             * @example 1203311
             */
            size: number;
        };
        User: {
            displayName: string;
            email: string;
            /** @example u_1 */
            id: string;
            isAdmin: boolean;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listAccounts: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountsOutputBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAccount"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Account"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    testAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConnectionParams"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TestResult"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PatchAccount"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Account"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listFolders: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FoldersOutputBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateFolders: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PutFoldersInputBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FoldersOutputBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    resyncAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Resync"];
            };
        };
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Implemented */
            501: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSyncStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SyncStatus"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getAttachment: {
        parameters: {
            query?: {
                /** @description Show in the browser (images only) instead of downloading. */
                inline?: boolean;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The attachment, with its own content type */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": string;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    autocompleteContacts: {
        parameters: {
            query: {
                /** @description Start of an address, a name or a word of the name. */
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContactSuggestions"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createDraft: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDraftBody"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Draft"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getDraft: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Draft"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateDraft: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDraftBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Draft"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteDraft: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    sendDraft: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["SendDraftBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SendResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    streamEvents: {
        parameters: {
            query?: {
                /** @description Same as the Last-Event-ID header, for clients that cannot set headers. */
                lastEventId?: string;
            };
            header?: {
                /** @description Set by EventSource on reconnect: replays the events after it. */
                "Last-Event-ID"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description A Server-Sent Events stream. Each event has id (sequence number), event (type) and data (JSON); types: message.new, thread.updated, thread.deleted, thread.merged, label.counts, label.changed, operation.failed, account.status, account.sync_progress, account.error, resync. Events caused by a request that carried X-Silo-Client have origin set to that id. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": string;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    pollEvents: {
        parameters: {
            query?: {
                /** @description Sequence number of the last event received; 0 starts from the oldest retained event. */
                after?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PollResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listLabels: {
        parameters: {
            query?: {
                /** @description Account; the active account when omitted. */
                accountId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LabelsOutputBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createLabel: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateLabelBody"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Label"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteLabel: {
        parameters: {
            query?: {
                /** @description Needed for system label keys; the active account when omitted. */
                accountId?: string;
            };
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateLabel: {
        parameters: {
            query?: {
                /** @description Needed for system label keys; the active account when omitted. */
                accountId?: string;
            };
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateLabelBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Label"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    modifyMessages: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ModifyBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getMessageHtml: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description HTML document fragment */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/html": string;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getMessageRaw: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description RFC 822 message */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "message/rfc822": string;
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getMeta: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Meta"];
                };
            };
            /** @description Error */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    undoOperation: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path: {
                /** @description operationId returned by a modify, trash, untrash, delete or undo request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResult"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    cancelOutbound: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Draft"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginInputBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Bad Gateway */
            502: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionsOutputBody"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    revokeSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listThreads: {
        parameters: {
            query?: {
                /** @description Account; the account of labelId, or the active account, when omitted. */
                accountId?: string;
                /** @description System key (INBOX, ...) or l_ id. Omitted: all mail except threads entirely in Trash or Spam. */
                labelId?: string;
                /** @description Full-text query (plain words; no operators yet). */
                q?: string;
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThreadList"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteThreads: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IDsBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    modifyThreads: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ModifyBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    trashThreads: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IDsBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    untrashThreads: {
        parameters: {
            query?: never;
            header?: {
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IDsBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationResult"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getThread: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ThreadDetail"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    uploadAttachment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description The file.
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadInfo"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
}
