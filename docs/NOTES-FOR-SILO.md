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
  edits a draft without TipTap (plain text editor on mobile): it needs a rule such as "a save with
  `bodyJson: null` makes `bodyHtml` authoritative and the web editor rebuilds its document from
  the HTML".
- **No unread summary across accounts.** The account switcher shows the unread Inbox count of
  every other account, as Gmail does; the only source is `GET /labels?accountId=` per account,
  so N accounts cost N requests each time the switcher opens (fetched lazily, cached 30 s).
  Proposal: `Account.inboxUnread` in `GET /session`/`GET /accounts`, or a
  `GET /labels/summary` with the INBOX counters of all accounts; the `label.counts` events of
  plan 5.4 could then keep it fresh for every account, not just the open one.
- **`settings.activeAccountId` is not written by the clients.** The start route opens it, but
  neither silo-web nor silo-mobile updates it when the user switches accounts, so "the account
  shown by default" never follows the last choice. Either the clients `PATCH /settings` on a
  switch, or the field should be documented as set only from settings.
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
  the allowed colours are not in the contract (silo-web hard-codes Gmail's); the mobile dialog
  and sheet create labels without a colour until the palette is shared (e.g. in `Meta`).
- **Undo of flag-only changes.** `OperationResult.undoUntil` is null for flag-only changes, yet
  they carry an `operationId` and `POST /operations/{id}/undo` accepts them (plan 5.2). Both
  clients show "Cofnij" whenever there is an `operationId` (for the default 4 s when
  `undoUntil` is null); the contract could state how long such an undo is meaningful.
- **`operation_not_undoable` vs `undo_expired`.** Both are 409 on undo; the clients show the
  same "Tej operacji nie można już cofnąć." for any 409. The difference is only in plan 5.3.
- **No event for created labels.** `POST /labels` answers the label and the client refetches
  `GET /labels`; other devices learn of it only from `label.counts` refetches. A
  `label.created` event (plan 5.4) would refresh their drawers.

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

## Compose editor (recommendation for a later slice)

Recommendation: **`@10play/tentap-editor`** (TipTap in a WebView, 1.1.0, peer
`react-native-webview`), not a plain `TextInput`.

- silo-web's compose is TipTap and drafts store `bodyJson` as TipTap JSON; tentap runs the same
  TipTap 3 extensions, so a draft started on the phone and finished in the browser (or the other
  way round) keeps its formatting, quotes and links, and `PUT /drafts/{id}` stays the same
  request on both clients.
- Cost: one WebView per compose screen (memory, start-up of about a few hundred ms), the TipTap
  bundle inside the app (on the order of 1 MB), a development build is needed for custom
  extensions (the stock editor works in Expo Go through `react-native-webview`), keyboard and
  toolbar integration has rough edges on Android. Estimated 3–5 days for compose with a basic
  toolbar (bold, italic, lists, link) and draft autosave.
- A plain `TextInput` is cheaper (about 1–2 days) and fully native, but loses formatting when it
  edits a draft from the web and needs the `bodyJson`/`bodyHtml` rule from the contract gaps
  above; acceptable only as a stop-gap (plain-text replies).
