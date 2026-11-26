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
    "/accounts/discover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Find the server settings of an address
         * @description Looks the address up in the Thunderbird ISPDB, the autoconfig file of its domain (autoconfig.<domain>, /.well-known/autoconfig), its SRV records (RFC 6186) and, last, the usual host names checked by a TLS handshake (no login), within 8 s. The response is 200 even when nothing is found (`imap` and `smtp` null, reasons in `sources`). `params` plus a password is a ConnectionParams body for POST /accounts/test. When the instance only allows its default servers (SILO_ALLOW_CUSTOM_SERVERS=false in mode imap) it answers with them at once (`source: default`) without contacting anything. Limited per user (10 per minute): 429 rate_limited.
         */
        post: operations["discoverAccount"];
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
         * @description Queues the request for the account's sync worker and returns at once. rebuild wipes the cache when the worker gets to it (account.status, resync and label.counts events follow) and runs the initial sync from scratch.
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
    "/admin/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List every mail account with its state */
        get: operations["adminListAccounts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List queued jobs
         * @description The newest 200 jobs matching the filters, without their payloads.
         */
        get: operations["adminListJobs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/jobs/{id}": {
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
         * Discard a job
         * @description Drops a job that is not running, e.g. a dead write-back operation (its local change is given up). 404 for running or unknown jobs.
         */
        delete: operations["adminDeleteJob"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/jobs/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Run a job again
         * @description A dead (or waiting) job becomes pending, due now, with its attempt count reset. 404 for running or unknown jobs.
         */
        post: operations["adminRetryJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List users with their accounts */
        get: operations["adminListUsers"];
        put?: never;
        /**
         * Create a user
         * @description Mode local only (409 not_available in mode imap, where users appear on their first sign-in). No mail account is created; the user adds accounts after signing in. 409 user_exists for a taken email.
         */
        post: operations["adminCreateUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/users/{id}": {
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
         * Delete a user
         * @description Removes the user with their accounts and everything Silo cached for them; mail servers are not touched. Admins cannot delete themselves (409 admin_self_change).
         */
        delete: operations["adminDeleteUser"];
        options?: never;
        head?: never;
        /**
         * Change a user
         * @description Disable or enable, grant or revoke admin rights, rename, set a new password (mode local; 409 not_available in mode imap). Admins cannot disable or demote themselves (409 admin_self_change).
         */
        patch: operations["adminUpdateUser"];
        trace?: never;
    };
    "/admin/users/{id}/totp/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Turn a user's TOTP off
         * @description For a lost device: the user signs in with the password alone and may set TOTP up again.
         */
        post: operations["adminResetUserTotp"];
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
         * @description A download (a_ id of a message attachment, or u_ id of an upload, e.g. a picture pasted into a draft); with inline=1 images are shown in the browser. An attachment that was not downloaded yet is fetched from the mail server together with its message (same wait and 503 as /messages/{id}/html).
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
    "/attachments/{id}/thumbnail": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Thumbnail of an image attachment
         * @description A thumbnail of a png, jpeg, gif (first frame) or webp attachment or upload (a_ or u_ id): size s is at most 64 px, m at most 256 px on the longer side (smaller pictures are not enlarged). JPEG, or PNG when the picture has transparency. Made on the first request and cached on the server; immutable. Other types (PDF included) and pictures over 20 megapixels are 415 thumbnail_unsupported; the thumbnail flag of an attachment tells which have one. An attachment that was not downloaded yet is fetched first (same wait and 503 as /attachments/{id}).
         */
        get: operations["getAttachmentThumbnail"];
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
         * @description Creates a draft with the DRAFT label: a new message, or with replyToMessageId a reply (reply: the sender or Reply-To; replyAll: also the other recipients without the account) in the thread of that message, or a forward (new thread). Subject (Re:/Fwd:) and quoted body are prefilled. Nothing reaches the mail server before the first PUT. The quote is the sanitised HTML of the original (its text when it has no HTML); a body not downloaded yet is fetched first (up to 10 s), else the quote is the snippet and warnings has quote_unavailable. Inline pictures shown by the quote are copied to the draft (inline, same cid). A forward also carries the attachments of the original (attachments, ids for attachmentIds); parts that cannot be downloaded are left out (attachments_unavailable), as are those over the attachment limit together (attachments_too_large).
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
         * @description Replaces the editable fields. version must be the version the client edited, else 409 draft_version_conflict (another window saved meanwhile). The draft and its thread are updated at once (thread.updated, draft.updated); the copy in the server's Drafts folder follows at least 30 s after the last save (right away with syncNow, when the compose window closes), always as exactly one message. The 409 carries currentVersion and current (the draft as saved meanwhile). With accountId of another account the draft moves there and the response has new ids (see accountId). An invalid address is 400 validation_failed with address and field.
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
         * @description Pushes changes of the mailbox as they are committed. After a reconnect with Last-Event-ID the missed events (24 h retained) are replayed first; an id older than the retention yields a resync event. A ': ping' comment is sent every 25 s; with it the session is checked, and a stream whose session ended gets session.expired and is closed. A client that cannot keep up is disconnected and replays on reconnect. At most 8 streams per user are open at once; a stream over the limit answers 200 with a single stream.limit event ({retryAfter: 30}, seconds; a retry: 30000 field slows down an EventSource that is not closed) and ends: close the EventSource and use /events/poll.
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
    "/filters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the filters of an account
         * @description In the order they are evaluated (position).
         */
        get: operations["listFilters"];
        put?: never;
        /**
         * Create a filter
         * @description Criteria are a query of the search syntax, evaluated on the server only (plan 2.6, 3.11) on new mail arriving in INBOX after the account went live; POST /filters/{id}/apply runs it on existing mail. Actions run as write-back operations without the undo window. 422: invalid_query (criteria), invalid_filter (no action, archive with trash, criteria matching everything, bad forwardTo), invalid_label (addLabelIds not user labels of the account).
         */
        post: operations["createFilter"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/filters/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a filter */
        get: operations["getFilter"];
        /**
         * Replace a filter
         * @description A full replacement (absent actions are off); position moves the filter within its account. Errors as in POST.
         */
        put: operations["updateFilter"];
        post?: never;
        /** Delete a filter */
        delete: operations["deleteFilter"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/filters/{id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Apply a filter to existing mail
         * @description Queues the job filter_apply: the messages of the account matching the criteria now (the same AST as search, as SQL; Spam and Trash left out unless the criteria name in:spam, in:trash or in:anywhere; drafts left out) get the actions in batches of 500, as operations without undo (thread.updated and label.counts as for modify). forwardTo is not applied to existing mail. When done, the event filter.applied {filterId, accountId, messages, threads} is sent. A disabled filter can be applied too.
         */
        post: operations["applyFilter"];
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
         * Rename, move, recolour or hide a label
         * @description Renaming a user label gives it a new IMAP keyword and moves its messages to it on the server (queued). parentId moves a user label under another user label of the account (null: top level; the label itself, a descendant or any other label answers 422 invalid_parent); the keyword stays. System labels and folders cannot be renamed or moved (400).
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
    "/oauth/{provider}/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * OAuth2 redirect URI (browser only)
         * @description The provider redirects the browser here; no session is needed (the state identifies the user, the cookie set by start the browser). The code is exchanged, the account tested with XOAUTH2 and created (or its authorization renewed), then 303 to SILO_PUBLIC_URL + returnTo with `?oauth=ok&accountId=acc_X` or `?oauth=error&code=<code>`: oauth_denied, oauth_state_invalid, oauth_exchange_failed, oauth_no_email, oauth_account_mismatch, account_limit_reached, account_test_failed, internal_error. The admin registers SILO_PUBLIC_URL + /api/v1/oauth/{provider}/callback with the provider.
         */
        get: operations["oauthCallback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/oauth/{provider}/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Start adding (or re-authorizing) an account with OAuth2
         * @description Returns the provider's authorization URL (authorization code flow with PKCE). The browser opens it; the provider sends it back to GET /oauth/{provider}/callback, which adds the account and redirects to SILO_PUBLIC_URL + returnTo. 404 when the provider is not configured on the instance, or for an accountId that is not an OAuth account of the user with this provider.
         */
        post: operations["startOAuth"];
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
    "/search/history": {
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
         * Forget searches
         * @description Removes one query (query=) or the whole search history of the account. Idempotent: 204 also when nothing matched.
         */
        delete: operations["deleteSearchHistory"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/suggest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Suggest completions for the search box
         * @description Everything is computed on the server (plan 2.6): up to 5 recent queries of the account starting with q (the 5 most recent for an empty q), then for the last token of q up to 5 contacts (from:<email>, or the key typed: to:, cc:, bcc:), up to 5 user or folder labels (label:<name>, or in:<name>) and up to 5 operators the token is a prefix of (is:u -> is:unread). A query is saved in the history when it is searched (GET /threads?q=, first page); the 50 most recent are kept per account.
         */
        get: operations["suggestSearch"];
        put?: never;
        post?: never;
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
         * @description In imap mode the credentials are verified with LOGIN on the default mail server. A new user and first account are created on first success. When the mail server is unreachable, a known user with the right password is let in and the account reports state `backoff`. In local mode the Silo password is checked (no mail server, no user or account is created); a user with TOTP enabled must also send totpCode: without it a correct password answers 401 totp_required, with a wrong code 401 invalid_credentials (a backup code works once). Every failure answers 401 invalid_credentials after a constant minimum time. Browsers get the silo_session cookie; with client.kind=bearer (native clients) no cookie is set and the body carries a token for the Authorization: Bearer header instead (shown once).
         */
        post: operations["login"];
        /** Sign out */
        delete: operations["logout"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/session/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Change the Silo password
         * @description Mode local only (409 not_available in mode imap, where the mailbox password is used). A wrong currentPassword is 403 invalid_credentials (throttled like sign-in). Every other session of the user is signed out; the current one stays.
         */
        post: operations["changePassword"];
        delete?: never;
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
        /**
         * Sign out everywhere else
         * @description Revokes every session of the user except the current one (their open event streams get session.expired). others=true is required.
         */
        delete: operations["revokeOtherSessions"];
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
    "/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get the user's settings
         * @description The same object as settings in GET /session.
         */
        get: operations["getSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Change settings
         * @description JSON merge: only the fields sent change; activeAccountId null clears it. The answer is the whole settings object with updatedAt; the other sessions of the user get settings.updated {updatedAt} and reload GET /settings. 422 invalid_setting (density, undoSendSeconds, signature over 32 KiB, an activeAccountId that is not the user's, an unsupported language or theme, over 1000 trustedImageSenders) or invalid_timezone.
         */
        patch: operations["updateSettings"];
        trace?: never;
    };
    "/snooze/presets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Suggested snooze times
         * @description Gmail's suggestions computed by the server in the user's time zone (settings.timezone, UTC when unset), so that clients do no date arithmetic: later_today (18:00, only when more than an hour away), tomorrow (08:00), this_weekend (Saturday 08:00, not on Saturday or Sunday) and next_week (Monday 08:00), in this order; a preset at the same time as an earlier one is left out (this_weekend on Friday, next_week on Sunday).
         */
        get: operations["snoozePresets"];
        put?: never;
        post?: never;
        delete?: never;
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
         * @description Keyset pagination: the cost does not depend on the page number. Threads entirely in Trash or Spam are left out of the all-mail view. With q: the threads with a message matching the query (plan 3.12; messages in Spam and Trash only with in:spam, in:trash or in:anywhere), newest first, at most 2000; labelId narrows them like in:. Words match prefixes of words in the subject, people, attachment names and the downloaded body (see indexing); has:attachment works before bodies are downloaded. A search that runs over 3 s answers an empty page with approximate: true. 422 invalid_query: a closing bracket without its opening one, or over 64 terms or 16 nested brackets (unclosed brackets and quotes are accepted).
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
    "/threads/{id}/snooze": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Snooze a thread until a time
         * @description The messages of the thread that are in INBOX turn SNOOZED at once (pendingSync) and move to the Snoozed folder of the mail server after the undo window (folder role snoozed; Silo creates the folder, named by the snoozed folder mapping or Snoozed, on the first snooze), with the keyword $SiloSnoozed when the server keeps keywords, so other clients do not show them in their inbox either. At until (precision 30 s, Silo must be running) they go back to INBOX, the newest unread, and the thread moves to the top of the list; a new message in the thread wakes it at once. Snoozing a snoozed thread again only changes its time. The answer can be undone with POST /operations/{id}/undo. A thread without mail in INBOX is 409 not_in_inbox (snooze is an inbox action, as in Gmail); until less than 30 seconds or more than a year ahead is 422 invalid_snooze. SNOOZED cannot be added with modify.
         */
        post: operations["snoozeThread"];
        /**
         * Wake a snoozed thread now
         * @description The same as the wake-up at the snooze time: the messages go back to INBOX at once (no undo window), without $SiloSnoozed, the newest unread, and the thread moves to the top of the list. Not undoable (operationId null). A thread that is not snoozed is 409 not_snoozed.
         */
        delete: operations["unsnoozeThread"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/totp": {
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
         * Disable TOTP
         * @description Needs the password and a TOTP or backup code; a wrong one is 403 invalid_credentials.
         */
        delete: operations["disableTotp"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/totp/backup-codes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Replace the TOTP backup codes
         * @description Needs the password and a TOTP or backup code; the previous backup codes stop working. The new ones are shown only this once.
         */
        post: operations["regenerateTotpBackupCodes"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/totp/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Enable TOTP
         * @description Confirms the secret of POST /totp/setup with a current code and turns TOTP on. Returns the backup codes, shown only this once. A wrong code is 422 invalid_totp_code.
         */
        post: operations["enableTotp"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/totp/setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Start TOTP setup
         * @description Mode local only. Generates a new secret (replacing one whose setup was not finished); TOTP is enforced only after POST /totp/enable. 409 totp_enabled when it is already on.
         */
        post: operations["setupTotp"];
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
         * @description multipart/form-data with one file part (any field name). The file is streamed to the blob store; its id goes to attachmentIds of PUT /drafts/{id}. Uploads not attached to a draft are deleted after 24 h. A file over the instance limit (SILO_MAX_ATTACHMENT_BYTES, 25 MB by default) is 413 upload_too_large. A picture pasted into the editor is uploaded with inline=true (a form field before the file, or the query parameter): the answer carries its cid, which the client puts in bodyHtml as <img src="cid:<cid>">; the server sends it in multipart/related with that Content-ID. Only image/* can be inline (422 inline_not_image).
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
            /**
             * @description How Silo signs in to the servers: the stored password, or OAuth2 (XOAUTH2; re-authorize with POST /oauth/{provider}/start and accountId after auth_failed).
             * @enum {string}
             */
            authType: "password" | "xoauth2";
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
        AdminAccount: {
            /**
             * @description How Silo signs in to the servers (see Account.authType).
             * @enum {string}
             */
            authType: "password" | "xoauth2";
            /** Format: date-time */
            createdAt: string;
            /**
             * Format: int64
             * @description Jobs of the account that failed for good (see GET /admin/jobs?status=dead).
             */
            deadOps: number;
            displayName: string;
            email: string;
            error: string | null;
            /** @example acc_1 */
            id: string;
            imapHost: string;
            /** Format: date-time */
            lastSyncAt: string | null;
            /**
             * Format: int64
             * @description Operations waiting for write-back to the mail server.
             */
            pendingOps: number;
            /** @enum {string} */
            state: "connecting" | "discovering" | "initial_sync" | "live" | "backoff" | "auth_failed" | "disabled";
            userEmail: string;
            /** @example u_1 */
            userId: string;
        };
        AdminAccountsOutputBody: {
            accounts: components["schemas"]["AdminAccount"][] | null;
        };
        AdminCreateUserInputBody: {
            displayName?: string;
            /** Format: email */
            email: string;
            isAdmin?: boolean;
            /** @description Silo password; generated and returned once as temporaryPassword when omitted. */
            password?: string;
        };
        AdminCreatedUser: {
            accounts: components["schemas"]["AdminUserAccount"][] | null;
            /** Format: date-time */
            createdAt: string;
            /** @description A disabled user cannot sign in; their sessions and account syncs are stopped. */
            disabled: boolean;
            displayName: string;
            email: string;
            /** @example u_1 */
            id: string;
            isAdmin: boolean;
            /** @description Generated password when none was given; shown only this once. */
            temporaryPassword?: string;
            totpEnabled: boolean;
        };
        AdminJob: {
            /** @description Account the job belongs to; null for instance-wide jobs (sending, cleanup). */
            accountId: string | null;
            /** Format: int64 */
            attempts: number;
            /** Format: date-time */
            createdAt: string;
            /** @example job_1 */
            id: string;
            /** @example imap_op */
            kind: string;
            lastError: string | null;
            /** Format: int64 */
            maxAttempts: number;
            /** Format: date-time */
            runAt: string;
            /**
             * @description pending also covers a job being run (claimed by a worker).
             * @enum {string}
             */
            status: "pending" | "running" | "done" | "dead";
            /** @description Owner of the account; null for instance-wide jobs. */
            userId: string | null;
        };
        AdminJobsOutputBody: {
            jobs: components["schemas"]["AdminJob"][] | null;
        };
        AdminPatchUserInputBody: {
            /** @description true signs the user out everywhere and stops their account syncs; false restarts them. */
            disabled?: boolean;
            displayName?: string;
            isAdmin?: boolean;
            /** @description New Silo password (mode local); signs the user out everywhere. */
            password?: string;
        };
        AdminUser: {
            accounts: components["schemas"]["AdminUserAccount"][] | null;
            /** Format: date-time */
            createdAt: string;
            /** @description A disabled user cannot sign in; their sessions and account syncs are stopped. */
            disabled: boolean;
            displayName: string;
            email: string;
            /** @example u_1 */
            id: string;
            isAdmin: boolean;
            totpEnabled: boolean;
        };
        AdminUserAccount: {
            email: string;
            error: string | null;
            /** @example acc_1 */
            id: string;
            /** Format: date-time */
            lastSyncAt: string | null;
            /** @enum {string} */
            state: "connecting" | "discovering" | "initial_sync" | "live" | "backoff" | "auth_failed" | "disabled";
        };
        AdminUsersOutputBody: {
            users: components["schemas"]["AdminUser"][] | null;
        };
        BackupCodesBody: {
            /** @description 10 single-use codes of 10 characters; only their hashes are stored. */
            backupCodes: string[] | null;
        };
        ChangePasswordInputBody: {
            currentPassword: string;
            /** @description At least 10 characters. */
            newPassword: string;
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
        DiscoverRequest: {
            /** @description Address of the account to configure. */
            email: string;
        };
        DiscoveredParams: {
            email: string;
            imapHost?: string;
            /** Format: int64 */
            imapPort?: number;
            /** @enum {string} */
            imapTls?: "implicit" | "starttls" | "none";
            smtpHost?: string;
            /** Format: int64 */
            smtpPort?: number;
            /** @enum {string} */
            smtpTls?: "implicit" | "starttls" | "none";
            username: string;
        };
        DiscoveredServer: {
            host: string;
            /** Format: int64 */
            port: number;
            /**
             * @description none only for the default servers of the instance (source default); discovery never returns an unencrypted server.
             * @enum {string}
             */
            tls: "implicit" | "starttls" | "none";
        } | null;
        Discovery: {
            /** @description Name of the mail provider, when the source gives one. */
            displayName?: string;
            domain: string;
            email: string;
            /** @description Null when no source found an IMAP server. */
            imap: components["schemas"]["DiscoveredServer"];
            /** @enum {string} */
            loginFormat: "email" | "localpart";
            /** @description The same settings as ConnectionParams fields. */
            params: components["schemas"]["DiscoveredParams"];
            /**
             * @description gmail and microsoft are the providers with OAuth2 and provider-specific sync.
             * @enum {string}
             */
            provider: "generic" | "gmail" | "microsoft";
            /** @description Null when no source found an SMTP server. */
            smtp: components["schemas"]["DiscoveredServer"];
            /** @description ispdb, autoconfig, srv, guess or default: the source of the IMAP server (else of the SMTP server); null when nothing was found. */
            source: string | null;
            /** @description Every source consulted, in order of preference. */
            sources: components["schemas"]["DiscoverySource"][] | null;
            /** @description Login name to use (the address or its local part). */
            username: string;
        };
        DiscoverySource: {
            /** @description What was found, or why the source gave nothing (for people, not for parsing). */
            detail: string;
            ok: boolean;
            /** @enum {string} */
            source: "ispdb" | "autoconfig" | "srv" | "guess" | "default";
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
            /** @description Only in the answer of POST /drafts: what the prefill could not do (quote_unavailable: the original body could not be downloaded, the quote is its snippet; attachments_unavailable: attachments of a forwarded message could not be downloaded and were left out; attachments_too_large: attachments over the attachment limit were left out). */
            warnings?: ("quote_unavailable" | "attachments_unavailable" | "attachments_too_large")[] | null;
        };
        ErrorDetail: {
            /** @description Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id' */
            location?: string;
            /** @description Error message text */
            message?: string;
            /** @description The value at the given location */
            value?: unknown;
        };
        Filter: {
            /** @example acc_1 */
            accountId: string;
            actions: components["schemas"]["FilterActions"];
            /** Format: date-time */
            createdAt: string;
            /**
             * @description Query in the search syntax, as written.
             * @example from:newsletter@x.com has:attachment
             */
            criteria: string;
            /** @description The criteria as the server parsed them (AST.String()). */
            criteriaNormalized: string;
            enabled: boolean;
            /** @example f_7 */
            id: string;
            /** @description Optional name given by the user (may be empty). */
            name: string;
            /**
             * Format: int64
             * @description 0-based order of evaluation within the account.
             */
            position: number;
            /** Format: date-time */
            updatedAt: string;
        };
        FilterActions: {
            /** @description l_ ids of user labels of the filter's account (IMAP keywords on the server). */
            addLabelIds: string[] | null;
            /** @description Skip the inbox: -INBOX, a move to Archive on the server. */
            archive: boolean;
            /**
             * Format: email
             * @description Send a copy to this address at once (no undo-send window); new mail only, never the account's own mail.
             */
            forwardTo: string | null;
            /** @description Mark as important (IMPORTANT, $Important). */
            important: boolean;
            /** @description Mark as read (\Seen). */
            markRead: boolean;
            /** @description Star (\Flagged). */
            star: boolean;
            /** @description Move to Trash; cannot be combined with archive. */
            trash: boolean;
        };
        FilterActionsInput: {
            addLabelIds?: string[] | null;
            archive?: boolean;
            /** @description null or absent: no forward. */
            forwardTo?: string;
            important?: boolean;
            markRead?: boolean;
            star?: boolean;
            trash?: boolean;
        };
        FilterApplyResult: {
            /**
             * @description The background job; filter.applied is sent when it is done.
             * @example j_k2
             */
            jobId: string;
            /**
             * Format: int64
             * @description Conversations the criteria match now; null when counting took too long.
             */
            matchedEstimate: number | null;
        };
        FilterBody: {
            /** @description POST: the account (the active one when omitted). PUT: ignored, a filter keeps its account. */
            accountId?: string;
            /** @description At least one action. */
            actions: components["schemas"]["FilterActionsInput"];
            /** @description Query in the search syntax; 422 invalid_query as in search, 422 invalid_filter when it matches everything (only in:anywhere). */
            criteria: string;
            /** @description Default true. */
            enabled?: boolean;
            name?: string;
            /**
             * Format: int64
             * @description 0-based place in the account's list (the others shift); POST: the end when omitted, PUT: unchanged when omitted. This is how filters are reordered.
             */
            position?: number;
        };
        FiltersOutputBody: {
            filters: components["schemas"]["Filter"][] | null;
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
            role: "inbox" | "sent" | "drafts" | "trash" | "junk" | "archive" | "all" | "snoozed" | "user";
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
             * @description Manual role; wins over SPECIAL-USE and names. One folder per role. snoozed: the folder of snoozed mail (Silo creates Snoozed on the first snooze when no folder has the role).
             * @enum {string}
             */
            role?: "sent" | "drafts" | "trash" | "junk" | "archive" | "all" | "snoozed" | "user";
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
        Indexing: {
            /**
             * Format: double
             * @description Share of the account's messages whose body is downloaded and indexed; 1 when the backfill is over.
             * @example 0.62
             */
            done: number;
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
             * @description User labels only: mirrored when the label is an IMAP keyword on the server, local_only when the server keeps no keywords (or rejected them), partial when it is a keyword except in the folders of localOnlyFolders (the 26 keywords of a Dovecot maildir folder are taken): there it lives only in Silo.
             * @enum {string|null}
             */
            keywordState: "mirrored" | "local_only" | "partial" | null;
            /** @description User labels in state partial: the f_ ids of the folders where the label is not written as a keyword. */
            localOnlyFolders?: string[] | null;
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
            /** @description Mode local: 6-digit TOTP code or a backup code, for users with TOTP enabled (send it after a 401 totp_required). */
            totpCode?: string;
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
            /** @description GET /attachments/{id}/thumbnail serves a thumbnail (png, jpeg, gif, webp); false for other types (PDF included). */
            thumbnail: boolean;
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
            /** @description OAuth2 providers configured on the instance (google, microsoft): silo-web offers "Sign in with ..." for them (POST /oauth/{provider}/start). Empty when none. */
            oauthProviders: string[] | null;
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
        OAuthStart: {
            /**
             * @description An OAuth account of the user to authorize again (after auth_failed); its address must be the one signed in with. Omitted: add an account.
             * @example acc_1
             */
            accountId?: string;
            /**
             * @description Path of silo-web the browser returns to after the callback (default /); a relative path starting with a single /.
             * @example /settings/accounts
             */
            returnTo?: string;
        };
        OauthStartOutputBody: {
            /** @description Opaque state of this authorization (valid 10 minutes, single use). */
            state: string;
            /** @description Authorization URL of the provider; open it in the browser (top-level navigation). */
            url: string;
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
             * @description incremental: sync all folders now; full: also compare every flag; rebuild: drop the cache of the account and run the initial sync from scratch (labels, filters, settings, search history and local drafts stay; snoozes and labels that are local only are re-attached by Message-ID and size; user labels come back from the IMAP keywords). Scheduled mail stays; refused with 409 rebuild_blocked while a send is in flight or due within a minute, or operations wait for write-back.
             * @default incremental
             * @enum {string}
             */
            mode: "incremental" | "full" | "rebuild";
        };
        SearchSuggestion: {
            /**
             * @description history: a recent query; contact: from:/to:/cc:/bcc: an address; label: label:/in: a user or folder label; operator: an operator.
             * @enum {string}
             */
            kind: "history" | "contact" | "label" | "operator";
            /**
             * @description What to show in the list.
             * @example Jan Kowalski <jan@firma.pl>
             */
            label: string;
            /**
             * @description The whole query after accepting the suggestion (the last token replaced); put it in the search box as is.
             * @example from:jan@firma.pl
             */
            text: string;
        };
        SearchSuggestions: {
            suggestions: components["schemas"]["SearchSuggestion"][] | null;
        };
        SecondFactorInputBody: {
            /** @description TOTP code or a backup code (consumed). */
            code: string;
            password: string;
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
            /** @description Whether the user wants desktop/system notifications of new mail; each client asks the system for its own permission. */
            desktopNotifications: boolean;
            keyboardShortcutsEnabled: boolean;
            /**
             * @description UI language shared by every client of the user (BCP 47 code of a supported language); en until the user chooses one.
             * @enum {string}
             */
            language: "en" | "pl";
            signature: string;
            /**
             * @description Colour theme of the silo-web client; other clients may ignore it. default until the user chooses one.
             * @enum {string}
             */
            theme: "default" | "dark" | "soft-gray" | "blue" | "lavender" | "rose" | "mint" | "seafoam";
            /**
             * @description IANA time zone name.
             * @example Europe/Warsaw
             */
            timezone: string;
            /** @description Sender addresses (lowercase) whose messages show external images without asking; always an array. */
            trustedImageSenders: string[];
            /**
             * Format: int64
             * @description Delay before a sent message leaves, in seconds.
             */
            undoSendSeconds: number;
            /**
             * Format: date-time
             * @description Time of the last PATCH /settings; null before the first one.
             */
            updatedAt: string | null;
        };
        SettingsPatch: {
            /**
             * @description acc_ id of an account of the user; null clears it (the first account is then the default).
             * @example acc_1
             */
            activeAccountId?: string | null;
            conversationView?: boolean;
            /** @description default, comfortable or compact; else 422 invalid_setting. */
            density?: string;
            desktopNotifications?: boolean;
            keyboardShortcutsEnabled?: boolean;
            /**
             * @description UI language: en or pl; else 422 invalid_setting.
             * @example pl
             */
            language?: string;
            /** @description HTML, at most 32 KiB (else 422 invalid_setting); stored sanitized like message HTML. */
            signature?: string;
            /**
             * @description Colour theme of silo-web: default, dark, soft-gray, blue, lavender, rose, mint or seafoam; else 422 invalid_setting.
             * @example dark
             */
            theme?: string;
            /**
             * @description IANA time zone name; else 422 invalid_timezone. Used by before:/after: of search and filters and by GET /snooze/presets.
             * @example Europe/Warsaw
             */
            timezone?: string;
            /** @description Replaces the whole list. Addresses are trimmed and lowercased; empty, invalid and duplicate ones are dropped. More than 1000: 422 invalid_setting. */
            trustedImageSenders?: string[] | null;
            /**
             * Format: int64
             * @description 5, 10, 20 or 30; else 422 invalid_setting. Sets undoUntil of POST /drafts/{id}/send.
             */
            undoSendSeconds?: number;
        };
        SnoozeBody: {
            /**
             * Format: date-time
             * @description Wake time (RFC 3339), typically the until of a preset from GET /snooze/presets; at least 30 seconds and at most a year ahead, else 422 invalid_snooze.
             */
            until: string;
        };
        SnoozePreset: {
            /**
             * @description Stable key; clients may translate the label by it.
             * @enum {string}
             */
            key: "later_today" | "tomorrow" | "this_weekend" | "next_week";
            /**
             * @description English label.
             * @example Tomorrow
             */
            label: string;
            /**
             * Format: date-time
             * @description The wake time to send to POST /threads/{id}/snooze.
             */
            until: string;
        };
        SnoozePresets: {
            presets: components["schemas"]["SnoozePreset"][] | null;
            /**
             * @description The time zone the presets were computed in (settings.timezone, UTC when unset).
             * @example Europe/Warsaw
             */
            timezone: string;
        };
        SnoozeResult: {
            /** @description Id of the operation for POST /operations/{id}/undo; null for unsnooze, which is not undoable (snooze again instead). */
            operationId: string | null;
            /** @description The thread after the change (list shape): SNOOZED instead of INBOX and snoozedUntil set, or back in INBOX. */
            thread: components["schemas"]["Thread"];
            /**
             * Format: date-time
             * @description End of the undo window: until then nothing reached the mail server; null for unsnooze.
             */
            undoUntil: string | null;
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
        TOTPSetupBody: {
            /**
             * @description otpauth:// URI to show as a QR code.
             * @example otpauth://totp/Silo:ala@example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Silo&algorithm=SHA1&digits=6&period=30
             */
            otpauthUrl: string;
            /**
             * @description Base32 secret (no padding) for manual entry.
             * @example JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP
             */
            secret: string;
        };
        TestResult: {
            imap: components["schemas"]["ProtocolResult"];
            smtp: components["schemas"]["ProtocolResult"];
        };
        Thread: {
            /** @example acc_1 */
            accountId: string;
            /**
             * Format: int64
             * @description Number of drafts in the thread (messages with the DRAFT label; a queued or sending message is SCHEDULED, not a draft); 0 without one. The list shows it as Draft / Drafts (n).
             */
            draftCount: number;
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
            /**
             * @description ob_ id of that send, for POST /outbound/{id}/cancel; null when scheduledAt is null.
             * @example ob_3k
             */
            outboundId: string | null;
            participants: components["schemas"]["Participant"][] | null;
            /** @description Local changes still waiting for the mail server. */
            pendingSync: boolean;
            /**
             * Format: date-time
             * @description When the queued send of the thread leaves (a scheduled send, or the undo-send window): outbound send_at while the send is queued or sending and still ahead; null otherwise. The Scheduled list is GET /threads?labelId=SCHEDULED.
             */
            scheduledAt: string | null;
            snippet: string;
            /**
             * Format: date-time
             * @description Wake time of a snoozed thread (POST /threads/{id}/snooze); null when not snoozed.
             */
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
            /** @description As in the thread list: ob_ id of that send, for POST /outbound/{id}/cancel. */
            outboundId: string | null;
            /**
             * Format: date-time
             * @description As in the thread list: when the queued send of the thread leaves; null otherwise.
             */
            scheduledAt: string | null;
            /**
             * Format: date-time
             * @description As in the thread list.
             */
            snoozedUntil: string | null;
            subject: string;
        };
        ThreadList: {
            /** @description Set (true) when a search hit its time limit (3 s): the page is empty and may be retried with a narrower query. Absent otherwise. */
            approximate?: boolean;
            /** @description Present with q only: how much of the account's mail has its body indexed; results may miss words of bodies not downloaded yet. */
            indexing?: components["schemas"]["Indexing"];
            /** @description Opaque; pass it as cursor for the next page. null on the last page. */
            nextCursor: string | null;
            /**
             * Format: int64
             * @description Threads in the view (exact for a label; for a search the number of matching threads, at most 2000).
             */
            resultSizeEstimate: number;
            threads: components["schemas"]["Thread"][] | null;
        };
        TotpEnableInputBody: {
            /** @description Current code of the authenticator app. */
            code: string;
        };
        UpdateDraftBody: {
            /** @description acc_ id: send the draft from another account of the user (the From choice). Only for a new message: a reply or forward is 409 draft_account_locked; another user's or an unknown account is 404. The draft then gets new ids (id, messageId, threadId: a new thread of that account; the old ones are gone, thread.deleted) and its copy in the old account's Drafts folder is removed; use the ids of the response from now on. draft.updated carries previousDraftId. */
            accountId?: string;
            /** @description u_ ids of uploads to attach, inline pictures included (and the attachments a forward carries); uploads left out are detached. */
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
            /**
             * @description User labels only: l_ id of the new parent (a user label of the same account, not the label itself or one of its descendants; else 422 invalid_parent); null moves the label to the top level. The name and the IMAP keyword do not change (the keyword comes from the leaf name).
             * @example l_12
             */
            parentId?: string | null;
            /** @enum {string} */
            showInList?: "show" | "hide" | "show_if_unread";
        };
        UploadInfo: {
            /**
             * @description Content-ID of an inline upload, generated by the server (without <>): put it in the HTML as <img src="cid:<cid>">. null for other uploads.
             * @example 5f0c1e2d9a8b4c7d6e5f4a3b2c1d0e9f@silo
             */
            cid: string | null;
            /** @example application/pdf */
            contentType: string;
            /** @example umowa.pdf */
            filename: string;
            /** @example u_91 */
            id: string;
            /** @description A picture shown in the body as cid:<cid> (pasted into the editor); it is sent in multipart/related. An inline upload the body does not refer to is sent as a plain attachment. */
            inline: boolean;
            /**
             * Format: int64
             * @example 1203311
             */
            size: number;
            /** @description GET /attachments/{id}/thumbnail serves a thumbnail (png, jpeg, gif, webp). */
            thumbnail: boolean;
        };
        User: {
            displayName: string;
            email: string;
            /** @example u_1 */
            id: string;
            isAdmin: boolean;
            /** @description Whether sign-in asks for a TOTP code (mode local). */
            totpEnabled: boolean;
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
    discoverAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DiscoverRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Discovery"];
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
    adminListAccounts: {
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
                    "application/json": components["schemas"]["AdminAccountsOutputBody"];
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
    adminListJobs: {
        parameters: {
            query?: {
                /** @description Only jobs in this state; all when omitted. */
                status?: "pending" | "dead";
                /** @description Only jobs of this account. */
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
                    "application/json": components["schemas"]["AdminJobsOutputBody"];
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
    adminDeleteJob: {
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
    adminRetryJob: {
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
                    "application/json": components["schemas"]["AdminJob"];
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
    adminListUsers: {
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
                    "application/json": components["schemas"]["AdminUsersOutputBody"];
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
    adminCreateUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdminCreateUserInputBody"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminCreatedUser"];
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
    adminDeleteUser: {
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
    adminUpdateUser: {
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
                "application/json": components["schemas"]["AdminPatchUserInputBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminUser"];
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
    adminResetUserTotp: {
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
    getAttachmentThumbnail: {
        parameters: {
            query?: {
                /** @description s: 64 px, m: 256 px (the longer side). */
                size?: "s" | "m";
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The thumbnail */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                    "image/png": string;
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
            /** @description Unsupported Media Type */
            415: {
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
            /** @description A Server-Sent Events stream. Each event has id (sequence number), event (type) and data (JSON); types: message.new, thread.updated (draftId and draftCount as in the thread list), thread.deleted, thread.merged, label.counts, label.changed, operation.failed, filter.applied ({filterId, accountId, messages, threads}: POST /filters/{id}/apply is done), settings.updated ({updatedAt}: reload GET /settings), account.status, account.sync_progress, account.error, resync, session.expired (the session was signed out, revoked, expired or its user disabled: the stream ends; sign in again), stream.limit ({retryAfter}: too many open streams of the user, the stream ends; fall back to /events/poll). Events caused by a request that carried X-Silo-Client have origin set to that id. */
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
    listFilters: {
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
                    "application/json": components["schemas"]["FiltersOutputBody"];
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
    createFilter: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FilterBody"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Filter"];
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
    getFilter: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path: {
                /** @description f_ id of the filter. */
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
                    "application/json": components["schemas"]["Filter"];
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
    updateFilter: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description f_ id of the filter. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FilterBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Filter"];
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
    deleteFilter: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path: {
                /** @description f_ id of the filter. */
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
    applyFilter: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path: {
                /** @description f_ id of the filter. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FilterApplyResult"];
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
    oauthCallback: {
        parameters: {
            query?: {
                code?: string;
                state?: string;
                /** @description Set by the provider instead of code when the user declined or the request failed. */
                error?: string;
                error_description?: string;
            };
            header?: never;
            path: {
                provider: string;
            };
            cookie?: {
                silo_oauth_state?: string;
            };
        };
        requestBody?: never;
        responses: {
            /** @description See Other */
            303: {
                headers: {
                    "Cache-Control"?: string;
                    Location?: string;
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content?: never;
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
    startOAuth: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description google or microsoft (as listed by GET /meta oauthProviders). */
                provider: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["OAuthStart"];
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
                    "application/json": components["schemas"]["OauthStartOutputBody"];
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
    deleteSearchHistory: {
        parameters: {
            query?: {
                /** @description Account; the active account when omitted. */
                accountId?: string;
                /** @description The query to forget (exact text, as in a history suggestion); omitted: the whole history of the account. */
                query?: string;
            };
            header?: never;
            path?: never;
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
    suggestSearch: {
        parameters: {
            query?: {
                /** @description Account; the active account when omitted. */
                accountId?: string;
                /** @description The query as typed so far (may be empty). */
                q?: string;
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
                    "application/json": components["schemas"]["SearchSuggestions"];
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
    changePassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordInputBody"];
            };
        };
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
    revokeOtherSessions: {
        parameters: {
            query: {
                /** @description Must be true: revoke every session but the current one. */
                others: boolean;
            };
            header?: never;
            path?: never;
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
    getSettings: {
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
                    "application/json": components["schemas"]["Settings"];
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
    updateSettings: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in settings.updated. */
                "X-Silo-Client"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SettingsPatch"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
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
    snoozePresets: {
        parameters: {
            query?: {
                /** @description Compute the presets at this time (RFC 3339) instead of the server's clock; for tests and previews. */
                now?: string;
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
                    "application/json": components["schemas"]["SnoozePresets"];
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
    listThreads: {
        parameters: {
            query?: {
                /** @description Account; the account of labelId, or the active account, when omitted. */
                accountId?: string;
                /** @description System key (INBOX, ...) or l_ id. Omitted: all mail except threads entirely in Trash or Spam. */
                labelId?: string;
                /** @description Search query in the Gmail syntax (from:, to:, subject:, label:, in:, is:, has:, before:, after:, older_than:, newer_than:, larger:, smaller:, filename:, list:, cc:, bcc:, deliveredto:, rfc822msgid:, OR, -, ( ), { }, "phrases"); parsed on the server. Saved in the search history of the account (first page only). */
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
    snoozeThread: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path: {
                /** @description t_ id of the thread. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SnoozeBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnoozeResult"];
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
    unsnoozeThread: {
        parameters: {
            query?: never;
            header?: {
                /** @description Client id, echoed as origin in the events it causes. */
                "X-Silo-Client"?: string;
            };
            path: {
                /** @description t_ id of the thread. */
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
                    "application/json": components["schemas"]["SnoozeResult"];
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
    disableTotp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SecondFactorInputBody"];
            };
        };
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
        };
    };
    regenerateTotpBackupCodes: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SecondFactorInputBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackupCodesBody"];
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
        };
    };
    enableTotp: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TotpEnableInputBody"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackupCodesBody"];
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
    setupTotp: {
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
                    "application/json": components["schemas"]["TOTPSetupBody"];
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
            query?: {
                /** @description true: an inline picture (same as the form field). */
                inline?: boolean;
            };
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
                    /**
                     * @description true: an inline picture; must come before the file part.
                     * @enum {string}
                     */
                    inline?: "true" | "false";
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
}
