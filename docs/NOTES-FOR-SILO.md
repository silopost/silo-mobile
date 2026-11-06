# Notes for the silo repository

Proposals and findings from silo-mobile that belong in the `silo` repository (plan, ADRs). They
are collected here until they are moved there; each entry says what to do with it.

## Proposal: ADR 0008 – React Native (Expo) for silo-mobile

Settles open decision 19 of the plan (technology of `silo-mobile`): silo-mobile is written in React Native with
Expo (SDK 58, new architecture, expo-router). Reasons:

1. **One code base for Android and iOS.** Two native apps (Kotlin + Swift) would double the cost
   of every feature; parity with the Gmail app is a long list of screens, and Android is the first
   target anyway.
2. **The same contract tooling as silo-web.** Types come from silo-server's OpenAPI through
   `openapi-typescript`, requests go through `openapi-fetch`, errors are the same `ApiError` over
   RFC 9457 problems, server state lives in TanStack Query. The `gen:api` script and the
   `api-contract` CI job are ports of silo-web's; a contract change breaks both clients the same
   way. No hand-written DTOs on either side (plan 2.6).
3. **One language for the team.** TypeScript end to end in the clients; code reviewers of
   silo-web can review silo-mobile, and helpers (error mapping, i18n map, date formatting) are
   ported, not rewritten.
4. **Testing without an SDK.** Expo Go runs the app on a phone from `npm start` with no Android
   SDK; CI proves the build with `expo export --platform android` (JavaScript bundle) plus
   typecheck, lint and jest with msw. A development build (`expo run:android`) is only needed once
   the app uses native modules outside Expo Go.
5. **Free distribution stays possible.** There is no EAS project: `expo prebuild` generates a
   plain Gradle project from `app.json` (continuous native generation), from which an APK can be
   built locally or by F-Droid's build server.
6. **Secure token storage is built in.** `expo-secure-store` keeps the bearer token of ADR 0007 in
   the Android Keystore / iOS Keychain.
7. **Remaining criteria of decision 19.** Background push goes through `expo-notifications`
   (FCM/APNs) bound to the bearer session (`POST /devices`, phase 6); offline storage can use
   `expo-sqlite` for the TanStack Query cache and the delta sync of `/changes` (phase 5).
8. **Risks.** App size (Hermes + React Native runtime, a release APK of roughly 20–30 MB before
   assets, larger than a native app); mail HTML has to be shown in a WebView (`react-native-webview`)
   with the same sanitised HTML endpoint as silo-web, so scrolling a long message inside a native
   thread list needs care; Expo's yearly SDK upgrades are mandatory work (breaking changes each
   release).

## Contract gaps found by mobile

- **No minimum client version for mobile.** `Meta` has `minWebVersion` but nothing for native
  clients; an outdated app installed on a phone cannot tell that the server no longer supports
  it. Proposal: `minClientVersions: {web, mobile}` or a `minMobileVersion` field.
- **No instance name in `Meta`.** The sign-in screen can only show "Silo · serwer 0.3.0"; with
  several instances (work, home) a display name of the instance (e.g. `SILO_INSTANCE_NAME`) would
  let the user confirm the address before typing the password.
- **`Retry-After` is not declared in OpenAPI.** Plan 5.3 promises it on 429 and 503, but no
  response in `openapi.yaml` declares the header, so generated types do not mention it; clients
  read it by convention.
- **Error codes are not enumerated in OpenAPI.** `Problem.code` is a free string; the codes the
  clients branch on (`invalid_credentials`, `rate_limited`, `upstream_imap_error`, ...) are only
  listed in plan 5.3 and the server source. An `enum` (or at least `examples`) would let both
  clients type-check their mapping.
- **`X-Silo-Client` is declared per operation, not globally.** It appears only on some mutating
  operations; native clients send it on every request (it identifies the installation in SSE
  `origin`). A note in `securitySchemes`/`info` or a shared parameter would make that explicit.
- **Draft body format ties the editor.** `Draft.bodyJson` is a TipTap document "stored as given"
  and `bodyHtml` is sent next to it. The contract does not say which one wins when a client
  edits a draft without TipTap (a plain text editor, a server-side prefill): it needs a rule such as "a save with
  `bodyJson: null` makes `bodyHtml` authoritative and the web editor rebuilds its document from
  the HTML".
- **No unread summary across accounts.** The account switcher shows the unread Inbox count of
  every other account, as Gmail does; the only source is `GET /labels?accountId=` per account,
  so N accounts cost N requests each time the switcher opens (fetched lazily, cached 30 s).
  Proposal: `Account.inboxUnread` in `GET /session`/`GET /accounts`, or a
  `GET /labels/summary` with the INBOX counters of all accounts; the `label.counts` events of
  plan 5.4 could then keep it fresh for every account, not just the open one.
- **`settings.activeAccountId` was not written by the clients.** Since slice 9b silo-mobile
  sends `PATCH /settings {activeAccountId}` when the user switches accounts (server 0.4.0); the
  contract could say that clients are expected to.
- **System view order is client-side.** `Label.position` orders user labels, but the Gmail
  order of the system views (Inbox, Starred, Snoozed, Important, Sent, Scheduled, Drafts, All
  mail, Spam, Trash) is hard-coded in both clients (`SYSTEM_VIEWS`); plan 5.5 could state it.
- `SessionInfo` already carries `lastSeenAt`, `kind` and `clientName`; nothing missing for the
  session list.
- **No sender pictures.** The Gmail app shows a contact photo (or a brand logo) in each row; the
  contract has no avatar URL for a participant nor an endpoint for one (Gravatar/BIMI lookups,
  contact photos), so both clients draw an initial on a colour hashed from the address. A
  `Participant.avatarUrl` (served by Silo, cached, privacy-preserving) or
  `GET /avatars/{email}` would close it. Likewise no attachment thumbnails for the row chips.
- **Order and role of `Thread.participants` are not specified.** The row avatar is "the last
  sender who is not the user"; mobile assumes `participants` is in message order and that its
  last non-`me` entry sent the newest message. A recipient-only participant (the user wrote the
  last message to Jan) cannot be told from a sender. Proposal: document the order and add
  `Thread.lastSender` (or `Participant.role: from|to`).
- **The user is `"me"` in `Participant.email`.** The convention (silo-web and mobile show "ja") is
  only visible from data; the schema should say so (e.g. `examples`, a description).
- **No aggregate of pending operations.** `Thread.pendingSync` is per thread and
  `SyncStatus.pendingOps` per account, fetched per account; there is no count across accounts
  (or in `GET /session`) for a "N zmian oczekuje" summary, and no way to list which threads are
  pending without paging through every view. Proposal: `pendingOps` on `Account` in
  `GET /session` and a `pending=true` filter on `GET /threads`.
- **Sync status has no mail server host.** The backoff banner names the server
  ("imap.example.com"); `SyncStatus` has only `email`, so the clients take `Account.imapHost`
  from the session. Fine while both are loaded together; a `host` field would make the banner
  self-contained.
- **Bulk read/unread needs thread states.** The selection bar offers "mark read" when any
  selected thread is unread; selections spanning pages not yet loaded ("Zaznacz wszystko" in
  Gmail selects only the loaded rows too) have no server-side "select all in view" operation
  (`POST /threads/*` take explicit ids). Not needed now, worth a note for large mailboxes.

- **No "all threads of a view" operation.** "Zaznacz wszystko" can only select the loaded rows:
  `POST /threads/modify|trash|untrash|delete` take explicit ids (and `IDsBody.ids` is nullable
  without saying what null means). Gmail offers "select all N conversations in this view"; a
  `{accountId, labelId, q}` selector in these bodies (server-side, one operation, one undo)
  would cover it.
- **Archive in a folder or user label view is not specified.** Plan 4.4 says `-<folder>`
  archives; the clients decide which label to drop from the view the user is in. silo-mobile
  sends `-INBOX` in system views, `-<folder>` in a folder view and `-INBOX -<label>` in a user
  label view (the Gmail app takes the label off there); silo-web always sends `-INBOX`. Worth
  one rule in the plan, or an archive operation that takes the view.
- **Moves leave the old location implicitly.** On `+<folder>`/`+INBOX`/`+SPAM` the server leaves
  the previous location (plan 4.4); the OpenAPI description of `ModifyBody` does not say so, and
  the clients mirror it optimistically by dropping every location label (Inbox, Spam, Trash,
  folders) themselves.
- **No label colour palette in the contract.** `CreateLabelBody` has `colorBg`/`colorText`, but
  the allowed colours are not in the contract (silo-web hard-codes Gmail's); mobile now offers the
  same 20 pairs on server 0.4.0 (see slice 9b below); the palette should be shared (e.g. in
  `Meta`).
- **Undo of flag-only changes.** `OperationResult.undoUntil` is null for flag-only changes, yet
  they carry an `operationId` and `POST /operations/{id}/undo` accepts them (plan 5.2). Both
  clients show "Cofnij" whenever there is an `operationId` (for the default 4 s when
  `undoUntil` is null); the contract could state how long such an undo is meaningful.
- **`operation_not_undoable` vs `undo_expired`.** Both are 409 on undo; the clients show the
  same "Tej operacji nie można już cofnąć." for any 409. The difference is only in plan 5.3.
- **No event for created labels.** `POST /labels` answers the label and the client refetches
  `GET /labels`; other devices learn of it only from `label.counts` refetches. A
  `label.created` event (plan 5.4) would refresh their drawers.

## Phase 4 on mobile (slice 9b: settings, filters, labels, thumbnails, inline pictures)

Findings while porting silo-web's phase 4 panels:

- **No label colour palette in the contract (still).** Mobile now offers Gmail's 20 pairs, the
  same as silo-web's `lib/labelColors.ts`, hard-coded in both clients. The server stores any pair;
  a shared palette (`Meta.labelColors` or an enum in `CreateLabelBody`/`UpdateLabelBody`) would
  keep the clients in step and let the server refuse unreadable pairs.
- **`desktopNotifications` has no mobile counterpart.** It is a browser setting; a phone needs
  push, which phase 6 brings. Proposal: `Settings.pushNotifications` (per user) and per-device
  state in `POST/DELETE /devices` (plan 5.1), so "Powiadomienia" can become an active entry. Mobile
  shows `desktopNotifications` read only, as an inactive entry.
- **The signature is not inserted by the server.** `POST /drafts` prefills recipients, subject and
  quote, but not `Settings.signature`; silo-web inserts it on the client (`withSignature`, a
  `div.silo-signature`), mobile does not (plan 2.6: the server owns the body). A new draft from the
  phone therefore has no signature, one from the browser has. Proposal: `POST /drafts` puts the
  signature in `bodyHtml` (above the quote, in the same `div.silo-signature`) so every client gets
  the same text, or a documented rule that clients do it.
- **The signature is HTML only.** A phone edits plain text; there is no `signatureText` (or a
  documented minimal HTML subset), so a signature saved from the phone loses silo-web's formatting.
- **`conversationView` is not honoured by any client view on mobile.** The app always shows
  threads (the API lists threads); the setting is not offered. Either the API gains a message list
  or the field could be documented as web-only.
- **Thumbnails need the bearer header.** `GET /attachments/{id}/thumbnail` cannot be put in an
  `<img>`/`Image` URL without a header (ADR 0007), so mobile uses React Native `Image` with
  `source.headers`; its native image cache may keep the pictures after sign-out. A signed,
  short-lived thumbnail URL (`thumbnailUrl` with an expiring signature, no session token) would let
  any image component and cache be used safely and make the preview cheaper.
- **Inline pictures in drafts:** `bodyJson` is free (TipTap JSON "stored as given"), so the form of
  an inline picture there is a convention of silo-web (`src` = the upload URL, `cid` attribute).
  Mobile follows it; the contract should state it (or say `bodyHtml` with `cid:` wins).
- **`settings.updated` payload:** `{updatedAt, origin}` only, so every other session refetches the
  whole object; fine, but the changed field names would let clients skip the request.
- **Filter list has no counts.** `Filter` has no "last applied" or "matched N" (only the
  `matchedEstimate` of an apply), so the list cannot show how active a filter is.
- **`FilterActionsInput.forwardTo` is `string` but `FilterActions.forwardTo` is `string | null`.**
  Clearing a forward means omitting the field in a PUT (a full replacement), which works but is
  only implied.
- **Label errors:** `PATCH /labels/{id}` declares 409 without a code in the schema (mobile reads it
  as "name taken") and `invalid_parent` only in prose.
- **`showInList` has three values but Gmail's app shows a switch.** Mobile's switch toggles
  `show`/`hide`; `show_if_unread` (set in silo-web) is shown as on, with "Gdy są nieprzeczytane"
  under the counters.

Deviations from silo-web (slice 9b):

- No "keyboard shortcuts" setting (`keyboardShortcutsEnabled`; no keyboard on a phone) and no
  `conversationView` switch (see above).
- The filter editor has no "advanced fields" form (silo-web's `AdvancedFieldsForm` with separate
  From/To/Subject/Has the words/Doesn't have fields); the criteria are one text field with the
  search chips that add `from:`, `to:`, `subject:`, `label:`, `has:attachment`. "Nie zawiera" and
  size criteria are typed.
- No drag to reorder filters (↑/↓ only), as in silo-web.
- The labels screen manages user labels only; server folders (create/delete a folder,
  `type: folder`) are not managed from the phone.
- No signature insertion in compose (see above; silo-web inserts it).
- Thumbnails: no thumbnails in the thread list rows (neither client; the row has no attachment
  list).

## Phase 4 on mobile (slice 9a: search, snooze, scheduled send)

Schema: contract 0.4.0 (`../silo-server/api/openapi.yaml` at the tag `v0.4.0`; `npm run gen:api`
without arguments reads `silo.serverRef` = `v0.4.0`). Findings:

- **No feature flags in `GET /meta`.** Plan 5.1 mentions capabilities of the instance, but `Meta`
  has only versions and limits; a client that must also work with an older server decides by
  `serverVersion` (mobile: `hasServerFeature` against 0.4.0, `dev` = newest). Proposal:
  `Meta.features: ["search", "snooze", "schedule", "settings", "filters", ...]`.
- **No batch snooze.** `POST/DELETE /threads/{id}/snooze` take one thread; snoozing a selection is
  N requests, N operations and N undos, and a partial failure has to be stitched together by the
  client. Proposal: `POST /threads/snooze {ids, until}` with one `OperationResult`, like
  `/threads/modify`.
- **`SnoozePreset.label` is English.** The clients translate by `key`
  (`later_today|tomorrow|this_weekend|next_week`); the label could follow the user's language or
  be dropped from the contract.
- **`/search/suggest` with an empty `q`** answers the five most recent queries (`kind: history`,
  documented in the operation description only); mobile shows them as "Ostatnie wyszukiwania" and
  keeps no local history. The limit (5 of the 50 kept) is not a parameter.
- **Time zone of the device vs `settings.timezone`.** Presets are computed in
  `settings.timezone` (UTC when unset) and `SnoozePresets.timezone` says which; mobile shows the
  preset times in that zone but rows, snackbars and the thread screen in the device's zone, and
  the custom date and time pickers use the device's clock. With the two zones apart the user
  sees two clocks; the session has no hint that they differ.
- **No send presets.** Plan 3.9 lists Gmail's "Jutro rano 8:00 / Jutro po południu 13:00 /
  Poniedziałek rano 8:00"; the contract has no endpoint for them (silo-web reuses the snooze
  presets, which lack the afternoon one). Mobile computes them on the device as proposals. The
  coordinator's proposal `GET /snooze/presets?scope=send` (or `/send/presets`) would put them on
  the server in `settings.timezone`.
- **`SendResult.undoUntil` of a scheduled send is the send time.** A snackbar shown until
  `undoUntil` would stay for days; mobile shows "Zaplanowano na … · Cofnij" for at most 10 s
  (the message stays cancellable from Zaplanowane). A separate `scheduledAt` in `SendResult`
  would make the difference explicit.
- **`thread.updated` carries `snoozedUntil` but not `scheduledAt`/`outboundId`.** A scheduled
  send changed elsewhere reaches the list only through `outbound.status` and a refetch.
- **`Indexing.done` is a fraction, not a flag**, and `ThreadList.approximate`/`indexing` are
  optional: the clients show the notes only when present (`done < 1`).
- **Error codes of phase 4** (`invalid_query`, `invalid_snooze`, `not_in_inbox`,
  `not_snoozed`, `send_in_progress`) are again only in prose (see "Error codes are not
  enumerated" above).
- **`DELETE /threads/{id}/snooze` returns `SnoozeResult` with `operationId: null`.** Fine, but
  the response type could be its own (no undo fields) so clients need not branch on nulls.

## Settings on mobile (slice 8)

silo-web has no settings or account screens yet (no use of `/accounts/test`, `PATCH` or
`DELETE /accounts/{id}`), so mobile goes first; the gaps below are what the port found.

- **No `/settings` in 0.3.0.** `GET /session` returns `Settings` (`density`, `undoSendSeconds`,
  `signature`, ...) but nothing can change them, so mobile keeps theme, density, swipe actions,
  confirmations, mark-read-on-open and remote images on the device (`useUi`). After phase 4
  `density`, `undoSendSeconds` and `signature` should move to `PATCH /settings`; `Settings.density`
  has `comfortable`, which mobile does not offer (Gmail has two densities on Android).
- **No `DELETE /sessions` (all but the current).** "Wyloguj wszędzie" lists `GET /sessions` and
  sends one `DELETE /sessions/{id}` per other session, then `DELETE /session`. Not atomic: a
  session created meanwhile survives. Proposal: `DELETE /sessions?except=current` or `POST
/sessions/revoke-all` (plan 3.15 "wyloguj wszędzie").
- **Dead operations are only a counter.** `SyncStatus.deadOps` tells how many jobs failed for
  good, but there is no endpoint to list them (kind, threads, error) or to retry/discard them
  (plan 5.7 "Nieudane operacje"). The account screen shows "Nieudane operacje: N" without a list.
- **`rebuild` answers 501.** `Resync.mode` lists `rebuild`; mobile offers only `incremental`
  ("Synchronizuj teraz") and `full` ("Pełne porównanie") until it is implemented.
- **No default mail server in `Meta`.** Without `allowCustomServers` the add-account form can only
  say "the default server of this instance"; `Meta.defaultImapHost`/`defaultSmtpHost` (or a
  display name) would let the user see where the account will live. Also the email domain could
  be validated against it before the test.
- **`PATCH /accounts/{id}` cannot change `email`, `username` or hosts.** A user whose provider
  renamed the IMAP host must remove and re-add the account (losing the cache). Also `PATCH` with
  a new `password` stores it without testing; a wrong password is noticed only when the sync
  fails again (`auth_failed`). Proposal: test the IMAP login on password change and answer 422
  `account_test_failed` as `POST /accounts` does.
- **`PATCH /accounts/{id}` does not declare 502** (`upstream_imap_error`/`upstream_smtp_error`,
  plan 5.3) and `DELETE /accounts/{id}` declares 422 without saying when; mobile handles any
  `Problem` the same way.
- **`Account.position` after a delete.** Positions are not renumbered, so `/u/<n>` URLs of the
  remaining accounts keep working, but a gap appears (0, 2). Worth stating in the contract, since
  both clients map `/u/<n>` to `position`.
- **No push devices.** "Powiadomienia" is an inactive entry until `POST /devices` (phase 6).
- **Limit of accounts is not in `Meta`.** `SILO_MAX_ACCOUNTS_PER_USER` is only seen as 409
  `account_limit_reached` after the connection test ran; `Meta.maxAccountsPerUser` would let the
  client hide "Dodaj konto" at the limit.
- **Folder settings (`GET/PUT /accounts/{id}/folders`) not ported.** The account screen lists the
  folders of `SyncStatus.folders` read only; mapping roles and `syncMode` is left for a later
  slice (the same data, a role picker per folder).

## Compose on mobile (slice 7)

Contract gaps and open questions found while porting compose:

- **No undo for discarding a draft.** `DELETE /drafts/{id}` is final; the Gmail app offers
  "Cofnij" after "Odrzuć". Mobile asks for confirmation instead. Proposal: a soft delete with
  `undoUntil` (as thread operations have) or `POST /drafts/{id}/restore`.
- **No scheduled send in 0.3.0** (done in slice 9a with contract 0.4.0). `SendDraftBody.sendAt` exists in the schema but is phase 4; the
  app always sends `{}` and the Scheduled view is read-only.
- **"Od" cannot change on an existing draft.** `Draft.accountId` is fixed at `POST /drafts` and
  `UpdateDraftBody` has no account; the Gmail app lets the sender change at any time. Mobile
  shows Od read-only: the FAB creates the draft for the account of the list. Proposal: an
  optional `accountId` in `UpdateDraftBody` (the server moves the draft between accounts).
- **The limit of a whole message is known only at send.** `Meta.maxAttachmentBytes` limits one
  file; the total (attachments + body) comes back as 413 `message_too_large` with `limit` only
  after "Wyślij". Proposal: `Meta.maxMessageBytes` so compose can warn while attaching.
- **Picked files may have no size.** Android's pickers do not always report one; such files skip
  the pre-check and rely on the server's 413 `upload_too_large`.
- **`bodyJson` vs `bodyHtml`: which is the source of truth** is still unspecified (see "Draft body
  format ties the editor" above). Both clients now send both from TipTap, so in practice they
  agree; a third client or a server-side edit (the reply prefill comes as `bodyHtml` with
  `bodyJson: null`) needs the rule written down.
- **409 has two meanings.** `PUT /drafts/{id}` and `POST /outbound/{id}/cancel` both answer 409
  (`draft_version_conflict`, `send_in_progress`); clients must branch on `Problem.code`, which is
  not enumerated (see "Error codes are not enumerated" above).
- **Contacts are not per account.** `GET /contacts/autocomplete` takes only `q`, so suggestions mix
  the addresses of all the user's accounts; fine for one person, worth an optional `accountId`.
- **`draft.updated` / `outbound.status` payloads** are only described in prose (see slice 5): the
  app reads `draftId`, `version`, `status`, `error` and `failedRecipients` with guards.

Deviations from the Gmail app:

- Od is read-only (above); no "Zaplanuj wysyłanie", "Poufnie" or signature insertion.
- No "Cofnij" after "Odrzuć" (above); a confirmation dialog instead.
- The formatting toolbar stays above the keyboard; Gmail shows it only for a text selection.
- The reply quote is part of the editor body (as in silo-web) rather than Gmail's folded "…"
  block.
- Contact suggestions come only from the server's learnt addresses, not the phone's contacts.

## Thread screen on mobile (slice 6)

- **Remote images are left in by the server.** `/messages/{id}/html` keeps remote images and its
  CSP allows `https:`/`http:` images; a browser honours that header, but the app loads the HTML
  as a string into a WebView, so the header never applies. silo-mobile blocks them itself (its
  own CSP meta in the document) until "Pokaż obrazy". Proposal (deferred decision 4):
  `?blockRemote=1` that rewrites remote `src` server-side, or an image proxy that also hides the
  reader's IP.
- **cid: images need the bearer header.** They point at `/api/v1/attachments/{id}?inline=1`; a
  WebView sends no `Authorization` with the sub-requests of a page and a token in the URL is
  forbidden (ADR 0007), so the app fetches them with the API client and inlines them as data URIs
  (5 MB per message; larger ones stay broken). Native clients would need signed short-lived URLs
  or an `inline=data` variant of `/messages/{id}/html`.
- **No thumbnails in 0.3.0.** Image attachments show a type icon;
  `/attachments/{id}/thumbnail` arrives in Faza 4.
- **ETag is not in the contract.** `/messages/{id}/html` and `/attachments/{id}` send `ETag` and
  `Cache-Control: immutable`, but OpenAPI declares neither and the server does not answer
  `If-None-Match` with 304; the app relies on `staleTime: Infinity` instead.
- **Attachment 503 without a delay for downloads.** The native downloader reports only the
  status, so the app says "spróbuj za chwilę" without the `Retry-After` value.
- **Thread STARRED/UNREAD are derived.** After `POST /messages/modify` the open thread mirrors
  "starred/unread when any message is"; silo-web's practice, not stated in the contract.
- **JavaScript in the WebView.** Auto height has no native alternative on Android in
  react-native-webview, so JavaScript is on for the injected height script; the document CSP keeps
  `script-src 'unsafe-inline'` for it. Message scripts are removed by the server and again by
  `prepareHtml`. Android's `evaluateJavascript` is probably not subject to page CSP, so
  `script-src 'none'` may work too – to be checked on a device.

## Deviations from the Gmail app (slice 6)

- **Newer/older arrows** at the bottom of the thread instead of Gmail's optional swipe between
  threads (a horizontal pan would fight the sideways scroll of wide mail in the WebView).
- **The message page stays white in dark mode**; Gmail darkens mail content.
- **Attachments open through the share sheet** (open with / share) rather than Gmail's viewer.
- **"Drukuj" and "Pokaż oryginał"** are left out of the menus.
- **"Oznacz jako nieprzeczytane od tej wiadomości"** marks the later messages unread and returns
  to the list, without "Cofnij" (per-message changes have no undo snackbar).

## Server events on mobile (slice 5)

**Decision: SSE over `fetch` streaming with a small parser, no `react-native-sse`.** React
Native has no `EventSource`. Expo SDK 58 installs `expo/fetch` as the global `fetch` (unless
`EXPO_PUBLIC_USE_RN_FETCH` is set); its `Response.body` is a `ReadableStream` fed by the native
request as data arrives (OkHttp on Android, URLSession on iOS), so a `text/event-stream` can be
read without a library. That keeps every header under the app's control (`Authorization:
Bearer`, `X-Silo-Client`, `Last-Event-ID`), adds no native-module or new-architecture risk,
and lets jest test the real reader against an msw stream. `react-native-sse` (XHR-based, also
sets headers) would have been the fallback; with React Native's own fetch (no body stream) the
attempt fails and the app falls back to polling. Reconnects are decided by the app, not the
transport: backoff 1 s doubling up to 30 s, 3 failures → `GET /events/poll` every 15 s (plan
3.14; silo-web: 5 s), SSE again every 5 min. Stream only in the foreground (`AppState`).

Gaps found:

- **Event payloads have no schema.** `/events` declares `text/event-stream` as a string and
  `PolledEvent.data` as a free object; the fields of each type (`threadId`, `labelIds`,
  `unreadCount`, `intoId`, `labels[]`, `operationId`, `kind`, `threadIds`, `draftId`,
  `version`, `status`, `failedRecipients`, `state`, the `SyncProgress` fields, `origin`) are
  only in plan 5.4 and the server. Both clients read them as `Record<string, unknown>` with
  guards. Proposal: one schema per event type (e.g. `ThreadUpdatedEvent`) referenced from
  `PolledEvent` as a `oneOf` discriminated by `type`, so `openapi-typescript` generates them.
- **The list of types in `/events` is incomplete.** The description names message.new …
  resync but not `draft.updated` and `outbound.status`, which plan 5.4 and both clients use.
  An `enum` on `PolledEvent.type` would make the list checkable.
- **No delta after a long offline.** Plan 3.14 says a native client resumes through
  `GET /changes?cursor=` (phase 5) after more than the 24 h retention; until it exists the
  server answers `resync` and the app invalidates every query (all lists, labels, threads are
  refetched as the user opens them). Fine for now, costly for large caches once offline storage
  (`expo-sqlite`) arrives.
- **No event for created labels** (see above): other devices see a new label only after a
  `label.changed`/refetch; `label.created` would refresh their drawers.
- **No way to tell an expired token from a stream refusal before reading.** A 401 on `/events`
  is `Problem`; the app treats it as the end of the session (as REST does). If the server ever
  answers 401 for other reasons on the stream (e.g. a per-connection limit), a distinct code
  (`429` with `Retry-After`) would keep clients from signing out.
- **Retry hint.** The server could send `retry:` in the stream (ignored by the app, which owns
  its backoff) or `Retry-After` on a 503 from `/events` under load; neither is in the contract.
- **Heartbeat interval is in prose only** (`: ping` every 25 s). silo-mobile relies on it: a
  stream silent for 60 s is treated as dead (mobile networks drop idle TCP connections without a
  FIN) and reopened with `Last-Event-ID`. The interval should be part of the contract.

## Deviations from the Gmail app (slices 3–4)

- **No swipes in Trash and Spam.** Gmail's swipe there restores or deletes; the device
  preferences only know archive/delete, so the rows of these views do not swipe and the
  selection bar offers delete forever, "To nie spam" and (menu) restore instead.
- **Sheets do not drag.** "Etykiety" and "Przenieś do" are Paper `Modal` sheets (scrim, back
  button and the sheet's buttons close them) rather than draggable ones: `@gorhom/bottom-sheet`
  would add a native-gesture dependency that jest-expo cannot run (see the reanimated stand-in)
  for a gesture rarely used there.
- **A label created in the sheet is checked, not applied at once.** silo-web applies a label
  created in its popover immediately; the mobile sheet checks it and sends it with the other
  changes on "OK", so one request carries the whole choice, as Gmail's sheet does.
- **No colours, rename or delete of labels** in the sheet or the drawer dialog yet.
- **Read/unread show a snackbar with "Cofnij"**, as in silo-web; the Gmail app marks silently.
- **Select all selects the loaded rows**, not every thread of the label (see the bulk note
  above).
- **Swipe colours are fixed** (Gmail green archive, red delete) rather than theme roles, to read
  the same in light and dark mode, as in the Gmail app.

## Stack decisions

- **Expo SDK 58** (React Native 0.88, React 19.3, new architecture) from the `blank-typescript`
  template, routes in `app/` (the template's guide suggests `src/app/`; the slice brief asked for
  `app/`, and non-route code is kept in `src/`).
- **ESLint:** `eslint-config-expo` 58 (flat config) on ESLint 9, not silo-web's hand-made
  typescript-eslint + react-hooks setup: Expo's preset already combines those rules and resolves
  React Native platform extensions. Its plugins (`eslint-plugin-react`, `eslint-plugin-import`)
  accept ESLint up to 9, so silo-mobile stays on ESLint 9 while silo-web uses 10.
- **react-native-paper 5** for Material 3 components with a minimal theme (Paper's MD3 defaults,
  Gmail blue as primary). Paper 5's `TextInput` ref type does not match React Native 0.88's
  (`TextInputHandles` vs the new instance type), so focus chaining between fields is left out for
  now. If Paper lags behind React Native releases again, the Gmail theme slice should weigh
  building the few components it needs on React Native primitives.
- **Tests:** `jest-expo` (Android preset), `@testing-library/react-native` 14 (async `render` and
  `fireEvent`), msw 3. jest-expo replaces `fetch` with Expo's native-backed one, which cannot
  carry msw's bodies; a custom test environment saves Node's own fetch classes and restores them
  (`jest.environment.js`, `jest.polyfills.js`). The `undici` package was tried first and dropped:
  its bodies hang on jest-expo's web-streams polyfill.
- **State:** TanStack Query for server state, zustand for the auth state (status, server address,
  token cached in memory), as in silo-web.
- Credentials (token, server address, installation id) live in `expo-secure-store`; device
  preferences (theme, swipe actions, density: not secret, not server settings) in
  `@react-native-async-storage/async-storage` through zustand's `persist` (slice 2).
- **Navigation drawer:** expo-router's `Drawer` (its bundled fork of react-navigation's drawer
  on `react-native-drawer-layout`, gesture-handler and reanimated 4), not a hand-made `Modal`:
  edge swipe, back handling and drawer state come with the router. Cost in jest: reanimated's
  own mock does not load under jest-expo's Android preset, so a small stand-in is mapped in
  `jest.config.js`, and `renderRouter`'s fake timers are limited to the clock so msw works.
- **Compose FAB:** Paper's `AnimatedFAB`, folded through its `extended` prop, which the
  thread list sets from the scroll direction (8 dp slop), as Gmail does.
- **Thread list:** `@shopify/flash-list` 2.3.2 (the Expo SDK 58 pin; v2 measures items itself,
  no `estimatedItemSize`). In jest it runs for real with the library's `jestSetup` (fixed
  measurements) rather than a `FlatList` stand-in.
- **Swipe:** a custom pan (gesture-handler 3 `usePanGesture` + reanimated 4) instead of
  `ReanimatedSwipeable`: Gmail's swipe slides the whole row out and acts on release past a
  threshold, while the library's Swipeable opens to reveal action buttons. The pan activates
  after 16 dp horizontally, fails after 12 dp vertically (the list scrolls) and has a negative
  left hit slop of the drawer's 32 dp edge (`swipeEdgeWidth`), so the edge swipe still opens the
  drawer. Not exercised in jest; to be checked on a device.
- **Paper `Menu` quirk:** a `Menu` mounted with `visible={false}` runs its hide animation and,
  when it ends, unmounts the portal of a menu opened in the meantime; the selection bar mounts
  the `Menu` only while it is open.
- **React Compiler** (on in Expo SDK 58) rejects manual `useMemo` it cannot preserve; screens
  rely on the compiler, `useCallback` stays only where it is preserved (row callbacks).
- **Theme:** primary stays Google blue as in the Gmail app (buttons, links, focus); Gmail red
  (`#C5221F`, `#F28B82` dark) is the `brand` colour of the logotype and important accents
  rather than `primary`, so Paper's controls do not turn red.

## Compose editor (decision, slice 7)

Decision: **`@10play/tentap-editor` 1.1.0** (TipTap 3 in the existing `react-native-webview`),
as recommended; the plain `TextInput` fallback (plan B) was not needed.

- Why: silo-web's compose is TipTap and drafts store `bodyJson` as TipTap JSON, so a draft moves
  between the phone and the browser with its formatting, quote and links, and `PUT /drafts/{id}`
  is the same request on both clients (`bodyHtml` and `bodyJson` saved together).
- Measured cost: `npx expo install` added 60 packages (TipTap 3, ProseMirror, lodash); the
  prebuilt editor page (`editorHtml`) is about 600 KB of JavaScript inside the app bundle (the
  Android Hermes bundle of `expo export` is 8.2 MB with it). It builds with `expo export` as is:
  no config plugin, no Babel or Metro change. Its small native module (`TenTapKeyboard`, custom
  keyboards only) is autolinked and optional: the editor itself works without it, a development
  build picks it up on the next rebuild. Integration took well under the estimated 3–5 days, but
  keyboard, caret and toolbar behaviour on a real Android device is still unverified (no device
  or emulator in this environment).
- Jest: the module is replaced by a fake bridge (`jest.setup.ts`) that keeps the content as HTML;
  the WebView editor itself is not exercised by tests.
- Typing: `useEditorBridge`'s `theme` (a `RecursivePartial<EditorTheme>`) exceeds TypeScript's
  instantiation depth when given the library's own `darkEditorTheme`, so it is cast.
- Schema risk: tentap's starter kit has more extensions than silo-web's editor (task list,
  highlight, colour, code). The mobile toolbar exposes only what the web toolbar has (bold,
  italic, underline, lists, link, quote), so drafts stay within the web's schema in practice;
  pasted rich text could still bring marks the web editor drops.
