# silo-mobile

**Android client of Silopost**, the open-source, self-hosted Gmail alternative: a React Native /
Expo app modelled on the Gmail app for Android (Material 3), talking to
[`silo-server`](https://github.com/silopost/silo-server) with bearer tokens.

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0%20(unreleased)-orange.svg)](package.json)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-58-000020.svg)](package.json)
[![CI](https://github.com/silopost/silo-mobile/actions/workflows/ci.yml/badge.svg)](https://github.com/silopost/silo-mobile/actions/workflows/ci.yml)

> **Status: unreleased, never run on a device.** Version 0.1.0 has mail feature parity with
> silo-web 0.3.0, but it has been verified only by type checking, lint, 405 unit and screen tests,
> an Android JavaScript bundle and a read-only smoke test against a live API – **not on a phone or
> an emulator**. The UI is in Polish only for now. See [Status and roadmap](#status-and-roadmap).

## Contents

- [What is Silopost?](#what-is-silopost)
- [Features](#features)
- [Repositories](#repositories)
- [Server compatibility](#server-compatibility)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Building for production](#building-for-production)
- [Architecture](#architecture)
- [Screens and endpoints](#screens-and-endpoints)
- [Development](#development)
- [Testing](#testing)
- [Differences from the Gmail app](#differences-from-the-gmail-app)
- [Status and roadmap](#status-and-roadmap)
- [Contributing](#contributing)
- [License](#license)

## What is Silopost?

Silopost gives you the Gmail experience on your own server and **without Gmail's limits**: no
15 GB cap shared with Drive and Photos, no ads, several mailboxes from any providers side by side,
and nobody who can lock you out. It is a **mail client**, not a mail server: it connects to any
IMAP/SMTP server, and storage is bounded only by that server's disk. The overview, the Gmail
comparison and the deployment stack are in the [`silo`](https://github.com/silopost/silo)
repository; the decision to use React Native is
[ADR 0010](https://github.com/silopost/silo/blob/main/docs/adr/0010-react-native-for-silo-mobile.md).

## Features

Mail feature parity with [silo-web](https://github.com/silopost/silo-web) 0.3.0 and the Gmail app
for Android:

- Drawer with system views, labels and server folders; several accounts with a switcher and unread
  counts.
- Thread list with infinite scroll, pull-to-refresh, swipe actions, multi-select and actions with
  Undo.
- Thread view: messages as cards, HTML in a locked-down WebView, `cid:` images, attachments with
  thumbnails, full-screen image preview.
- Compose: TipTap editor (drafts move between phone and browser), attachments, inline images,
  autosave, undo send, scheduled send.
- Search with suggestions, history and filter chips; snooze; settings (device and server-side),
  filters, label management, sessions.
- Live updates over SSE (streaming `fetch`) with a polling fallback, in the foreground only.
- Light and dark Material 3 themes tuned to the Gmail app.

Deviations from parity are listed in [Differences from the Gmail app](#differences-from-the-gmail-app).

## Repositories

| Repository | License | Contents |
|---|---|---|
| [`silo`](https://github.com/silopost/silo) | MIT | Orchestration (Docker Compose, Caddy, scripts), documentation, ADRs |
| [`silo-server`](https://github.com/silopost/silo-server) | AGPL-3.0 | Go backend: API, SSE, IMAP sync, SMTP, workers |
| [`silo-web`](https://github.com/silopost/silo-web) | AGPL-3.0 | React/TypeScript web client and PWA |
| [`silo-mobile`](https://github.com/silopost/silo-mobile) (this one) | AGPL-3.0 | React Native/Expo Android client |

## Server compatibility

| silo-server | What works |
| --- | --- |
| 0.3.0 (minimum) | bearer sign-in, list, thread, actions with Undo, compose and undo send, attachments, accounts, sessions, events; settings on the device only; plain-text search (no suggestions, history or chips) |
| 0.4.0 | everything above plus search with operators and suggestions, snooze, scheduled send, synced settings (`/settings`), filters, label management (colours, parent, `showInList`, `keywordState`), thumbnails, inline images |
| 0.5.0 | expected to work as with 0.4.0 (the 0.5.0 contract is additive; not verified). Not supported yet: sign-in with TOTP (`401 totp_required`, no code field), adding OAuth2 accounts (needs a native-client variant on the server), the admin panel, changing "From" in a draft, `DELETE /sessions?others=true`. OAuth2 accounts added in silo-web sync normally |
| ≤ 0.2.0 | not supported (no bearer sign-in) |

`GET /meta` has no feature flags, so `src/lib/features.ts` (`hasServerFeature`,
`useServerFeature`) compares `Meta.serverVersion` with the version each feature appeared in
(`search`, `snooze`, `schedule`, `settings`, `filters`, `labels`, `thumbnails`, `inlineImages` – all
0.4.0). Versions compare by MAJOR.MINOR.PATCH, a pre-release counts as the release, an unparsable
version (`dev`, empty, a commit) is treated as the newest, and until `/meta` is known no 0.4.0
feature is available. Features the server lacks are hidden.

The API schema is generated from the OpenAPI document of silo-server `v0.4.0` (`silo.serverRef` in
`package.json`). Full table: [compatibility matrix](https://github.com/silopost/silo/blob/main/docs/compat-matrix.md#silo-mobile).

## Requirements

- Node.js 22 or newer (`.nvmrc`: 22; also checked on Node 24) and npm.
- A running silo-server reachable from the phone or emulator – normally the dev stack of the
  [`silo`](https://github.com/silopost/silo) repository.
- One of:
  - **Expo Go** on an Android phone (no Android SDK needed), or
  - the **Android SDK** (Android Studio, `adb`, an AVD) for development builds and emulators.

## Quick start

Start the API (in the `silo` repository) and the Expo dev server:

```sh
# in ../silo
scripts/dev-up.sh postgres mailserver silo-server   # API on SILO_DEV_SERVER_PORT (default 8080)
scripts/seed-mail.sh --all                          # sample mail, before the first sign-in

# here
npm ci
npx expo start          # Expo dev server; scan the QR code with Expo Go
npm run android         # the same, and open the app on a connected device or emulator
npx expo run:android    # development build (needs the Android SDK)
```

- **Expo Go (Android)**: install Expo Go on the phone and scan the QR code from `npx expo start`.
  Every native module of the app is available in Expo Go, including the WebView
  (`react-native-webview`), the TenTap editor (its optional `TenTapKeyboard` module is only for
  custom keyboards) and the date/time picker.
- **Instance address** on the sign-in screen: `http://10.0.2.2:8080` in the Android emulator (the
  host machine), your computer's LAN address on a phone, for example `http://192.168.1.10:8080`
  (`localhost` on the phone is the phone itself), `https://mail.example.com` in production. Then
  the mailbox address and password, for example `dev1@silo.test` / `devpass1`.
- **Cleartext HTTP** works only in development (Expo Go and debug builds allow traffic without
  TLS); an Android release build blocks it by default, so a production instance must use HTTPS.
- **Development build / emulator**: `npx expo run:android` generates `android/` (continuous native
  generation, not committed) and installs a debug build.

## Configuration

There is no build-time configuration of the instance: the user enters the instance address on the
sign-in screen, and the app reads everything else from `GET /api/v1/meta`.

| Setting | Where | Notes |
| --- | --- | --- |
| Instance address, bearer token, installation id | `expo-secure-store` (Android Keystore / iOS Keychain) | the token is also kept in memory (zustand `src/state/auth.ts`); never in a URL or the query cache |
| Device preferences: theme, swipe actions, density (server 0.3.0), confirmations, mark as read on open, remote images | AsyncStorage via zustand `persist` (`src/state/ui.ts`) | not secret; they change only the look and which request is sent |
| Density, undo-send delay, signature, time zone, active account (server 0.4.0) | server (`GET/PATCH /settings`) | shared with silo-web |
| App identity | `app.json` | name `Silo`, package `dev.silopost.mobile`, scheme `silopost` |
| Targeted server contract | `package.json` → `silo.serverRef` | currently `v0.4.0` |

Environment variables are used only by the tooling: `SILO_URL`, `SILO_EMAIL`, `SILO_PASSWORD` and
`SILO_DEVICE` for `npm run smoke:api` (see [Testing](#smoke-test-against-a-live-api)) and
Expo's own `EXPO_PUBLIC_USE_RN_FETCH`, which switches the global `fetch` back to React Native's instead of
`expo/fetch` (without a streaming body, so live events fall back to polling).

## Scripts

| Script | Description |
| --- | --- |
| `npm start` / `npm run android` | Expo dev server (Android: also opens the app) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint 9 (`eslint-config-expo`, flat config) |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Jest (preset `jest-expo` for Android) |
| `npm run gen:api` | regenerate `src/api/schema.d.ts` (see [API contract](#api-contract)) |
| `npm run gen:icons` | Expo icons in `assets/` from `assets/icon.svg` (a copy of `silo-web/public/icons/icon.svg`) |
| `npm run export:android` | `expo export --platform android` into `dist/` |
| `npm run smoke:api` | read-only smoke test against a live API (`scripts/smoke-api.mjs`) |

## Building for production

There is no signed release and no EAS project yet. A release APK (for example for F-Droid) is built
from the generated native project:

```sh
npx expo prebuild --platform android    # generates android/
cd android && ./gradlew assembleRelease   # on Windows: gradlew.bat assembleRelease
```

`npm run export:android` produces the Hermes JavaScript bundle (`dist/`, about 8.4 MB), the same
step a release build runs; CI runs it on every push. Signing, store distribution and F-Droid are
not set up.

## Architecture

### Thin client

All domain logic lives in silo-server; the app renders state, caches it and applies optimistic
updates. It makes no decision silo-web could not repeat: the Undo window is the server's
`undoUntil` (no local timer and no inverse modify), draft autosave is `PUT /drafts/{id}` with
`version`, the search query goes out as `q` exactly as typed (parser, suggestions and history are
the server's), snooze presets come from the server, waking and scheduled sending happen on the
server, and filters are matched and applied by the server. Only presentation, gestures, device
preferences and the in-memory buffer of the draft being edited stay local.

Layers (dependencies point down only):

| Layer | Directory | Role |
| --- | --- | --- |
| routes | `app/` | expo-router (files = URLs, as in silo-web); thin, they render screens |
| screens | `src/screens/` | one screen per route (label list, thread, compose, search, settings) |
| features | `src/features/` | components and hooks per area: `nav`, `topbar`, `accounts`, `shell`, `threadlist`, `thread`, `compose`, `labels`, `snooze`, `search`, `settings`, `sync`, `toasts` |
| queries, mutations, events | `src/api/queries`, `src/api/mutations`, `src/api/events.ts`, `src/api/sse.ts`, `src/api/drafts.ts` | TanStack Query (`keys.ts`), optimistic updates and undo, the event stream and its mapping onto the cache, uploads |
| API client | `src/api/client.ts`, `auth.ts`, `errors.ts`, `schema.d.ts` | `openapi-fetch` with OpenAPI types, headers, 401 → sign-out, `ApiError` over RFC 9457 |
| state and libraries | `src/state/`, `src/lib/` | zustand (auth, preferences, selection, toasts, connection, compose), pure functions (formatting, addresses, HTML, theme) |

State: threads, labels, drafts, accounts, sessions, settings, filters, `sync-status` and `/meta`
live on the server and in the TanStack Query cache (updated by events; `/meta` and message HTML
with `staleTime: Infinity`). The draft being edited lives in memory (`DraftSession`) – there is no
local draft store; it is saved after 2 s of idle time, on blur, on close and when the app goes to
the background. Selection, toasts, connection state and remote draft versions are in-memory
zustand stores (`selection.ts`, `toasts.ts`, `connection.ts`, `compose.ts`).

### Authentication and headers

- Sign-in (`src/api/auth.ts`): `POST /session` with `client: {kind: "bearer", name: <device
  name>}` ([ADR 0007](https://github.com/silopost/silo/blob/main/docs/adr/0007-bearer-tokens-for-native-clients.md);
  the name comes from `expo-device`, up to 100 characters). The token goes to the secure store; the
  session body seeds `GET /session` in the cache (without the token).
- Every request (`src/api/client.ts`) carries `Authorization: Bearer <token>` and
  `X-Silo-Client: silo-mobile/<version>#<installation id>`; the server echoes it as the `origin` of
  events, which lets the app recognise its own changes. `fetch` is resolved on every call (msw in
  tests).
- A 401 (other than a failed `POST /session`) ends the session: the app clears the token and the
  cache and shows the sign-in screen; late answers to requests made with the old token are
  ignored.
- Sign-out: `DELETE /session`, and on an error other than 401 (for example offline) locally anyway
  (the session can be revoked from another device). Sign out everywhere: `DELETE /sessions/{id}`
  for every other session from `GET /sessions` (404 = already expired), then `DELETE /session`; if
  one could not be revoked, the device stays signed in and shows an error.
- Errors: `ApiError` (`src/api/errors.ts`) with `status`, `code` (the stable field to branch on),
  `retryAfter` (seconds from `Retry-After` on 429/503) and the whole `Problem` (`limit`, `current`,
  `address`/`field`). Messages are chosen by `code` plus the server's `detail`; request fields
  (the password) never reach a snackbar or a log.

### Events: SSE, polling, app state

- **Stream** (`src/api/sse.ts`): `GET /api/v1/events` through `fetch` with an incremental
  `text/event-stream` parser. React Native has no `EventSource`; the global `fetch` of Expo SDK 58
  is `expo/fetch`, whose `Response.body` is a `ReadableStream` fed as data arrives (OkHttp on
  Android, URLSession on iOS). Each attempt sends `Authorization`, `X-Silo-Client` and, when
  resuming, `Last-Event-ID` as a header; the token never goes into the URL. A stream silent for
  60 s (the server pings every 25 s) is considered dead and reopened.
- **Reconnect and fallback** (`connectEvents` in `src/api/events.ts`, settings in `eventsConfig`):
  retry after 1 s, 2 s, … (up to 30 s); after 3 failures in a row, polling
  `GET /events/poll?after=<lastId>` every **15 s** (silo-web: 5 s; the phone saves battery) and a
  return to SSE every 5 min. The first poll without a position skips the backlog and refreshes
  everything. After a failed stream the app probes `GET /meta`: when Silo does not answer, the
  state is `offline`. A 401 from the stream does not loop – it ends the session like REST.
- **Mapping** (`applyEvent`, ported from silo-web): `thread.updated` patches rows and the open
  thread (lists refresh when the thread is new or moved; `snoozedUntil` too), `label.counts` writes
  counters into `/labels`, `operation.failed` rolls the change back through
  `handleOperationFailed` (snapshot from `recentOps` in memory, a message by `kind`),
  `draft.updated` stores the remote version for compose (`src/state/compose.ts`),
  `outbound.status: failed` shows a failed-send toast that opens `/compose?draftId=`,
  `settings.updated` from another `origin` refreshes `GET /settings`, `filter.applied` shows the
  result and refreshes lists and labels, account events refresh `sync-status` and the session,
  `resync` refreshes everything, and `message.new` refreshes lists only (no local notification).
  The app's own `thread.updated` (`origin` = its `X-Silo-Client`) is ignored while a thread
  operation runs (`isThreadOpRunning`).
- **Lifecycle** (`src/features/sync/useEvents.ts`, mounted once in `app/(app)/_layout.tsx`): the
  stream is open only when signed in and in the foreground. `background`/`inactive` close the
  stream or polling; coming back reconnects with `Last-Event-ID` and invalidates lists, labels and
  `sync-status` (the equivalent of `refetchOnWindowFocus`). Network recovery (NetInfo) reconnects
  at once. Sign-out disconnects and forgets the last id. The root layout feeds `focusManager` from
  `AppState` and `onlineManager` from NetInfo.
- **Connection state** (`src/state/connection.ts`: `connecting | live | polling | offline`): when
  `offline`, the list shows a "can't reach Silo, retrying" notice; when polling, nothing.
- After more than 24 h without a stream (the retention of `events`) the server answers `resync`
  and the app refreshes every query; a delta endpoint `GET /changes` will replace this.

### Message content: WebView and images

- `messageHtmlQuery` fetches `GET /messages/{id}/html` as text (`staleTime: Infinity`; a 503 is
  retried after `Retry-After` up to 6 times, with a loading and then a retry state).
- `prepareHtml` (`src/lib/messageHtml.ts`) wraps the content in a document with its own CSP
  (`default-src 'none'`; images only `data:`/`blob:` until the user chooses to show images, which
  adds `https:`/`http:` for that message; the "always show images" preference skips the question)
  and a device-width viewport (wide mail scrolls sideways inside the card). The server's CSP header
  does not apply because the HTML is loaded as a string. Scripts are removed by the server and
  again by `prepareHtml`.
- `cid:` images are replaced with data URIs fetched by the API client with the bearer header
  (`fetchInlineImages`, up to 5 MB per message; larger ones stay broken).
- `react-native-webview`: JavaScript is enabled only for the injected height script
  (`injectedJavaScript` → `onMessage`; the CSP keeps `script-src 'unsafe-inline'` for it); every
  navigation is refused – http(s) links open in a Custom Tab (`expo-web-browser`), `mailto:`/`tel:`
  through `expo-linking`, other schemes are ignored; no file access, DOM storage, cookies or cache.
  The page stays white in dark mode.

### Attachments and uploads

- **Download** (`AttachmentChips.tsx`): `expo-file-system/legacy` `createDownloadResumable` with
  the `Authorization` and `X-Silo-Client` headers into `cacheDirectory`, a progress bar in the chip,
  then the share sheet (`expo-sharing`); a 503 says the attachment is not downloaded yet.
- **Thumbnails** (0.4.0): `GET /attachments/{id}/thumbnail?size=s|m` through React Native `Image`
  with `source.headers` (no new native module; `expo-image` not needed); 415 or an error → the type
  icon. The native image cache may keep thumbnails after sign-out (Android has no public API to
  clear it). An image opens a full-screen preview (`GET /attachments/{id}?inline=1`) with share or
  save.
- **Upload** (`uploadFile` in `src/api/drafts.ts`): `multipart/form-data` (`file` as
  `{uri, name, type}`) to `<server>/api/v1/uploads` through `XMLHttpRequest` (for
  `upload.onprogress`), with `Authorization` and `X-Silo-Client`; at most 3 at a time
  (`queueUpload`); the × on a tile aborts (`AbortSignal`). A file larger than
  `Meta.maxAttachmentBytes` is refused before sending; files without a size (Android pickers) rely
  on `413 upload_too_large` with `limit`. Inline image: `inline=true` (sent as the first field).

### Thread actions, optimistic updates and Undo

Rows, swipe, the selection bar and the thread screen call `useThreadActions().run(action, ids,
opts)` (`src/features/threadlist/actions.ts`), implemented by `ThreadActionsRoot` around the
account drawer with `runThreadAction` (`src/api/mutations/threads.ts`). Without a choice,
`run('labels')` opens the labels sheet, `run('moveTo')` the move-to sheet and `run('deleteForever')`
a confirmation; `opts.after` runs after the local change (back to the list), `opts.onUndo` after
Undo (reopening the thread).

| Action | Request |
| --- | --- |
| archive | `POST /threads/modify` `-INBOX` (folder view: `-<folder>`; label view: `-INBOX -<label>`) |
| delete; Trash in "move to" | `POST /threads/trash` |
| restore from Trash | `POST /threads/untrash` |
| delete forever (after confirmation) | `POST /threads/delete` (no undo) |
| report spam / not spam | modify `+SPAM` / `-SPAM` |
| read / unread | modify `-UNREAD` / `+UNREAD` |
| star / unstar (no snackbar) | modify `+STARRED` / `-STARRED` |
| labels (sheet, after OK) | one modify with the added and removed labels |
| move to Inbox / Spam / a folder | modify `+<target>` (the server removes the old location) |
| move to a user label | modify `+<label> -INBOX` (as Gmail does) |
| move to Archive | as archive |
| snooze / unsnooze (0.4.0) | `POST /threads/{id}/snooze {until}` / `DELETE /threads/{id}/snooze`, one request per thread |
| star a message, "mark unread from here" | `POST /messages/modify` (`src/api/mutations/messages.ts`, no undo) |
| Undo | `POST /operations/{id}/undo` (for snooze, one per thread) |

Every action snapshots the lists, labels and open threads in the cache, applies the change locally
(a row leaves a list it no longer belongs to, label counters follow – as in silo-web), sends the
request and overwrites the cache with the threads from the answer. The snackbar names the result
with Undo until `undoUntil` (4 s when `undoUntil` is null but there is an `operationId`); Undo
restores the snapshot at once and calls the undo endpoint, whose answer is merged (409 → the
operation can no longer be undone). On an error the snapshot comes back with a retry message; when
no operation is running, lists and labels are refreshed. Operations on the same threads are
serialised (mutation `scope`). Optional confirmations (preferences) ask before `trash`/`archive`
from a row, the bar or the thread.

### Compose and drafts

- **Opening**: the FAB → `/compose?accountId=<account of the list>`; the screen sends
  `POST /drafts {accountId}` once and writes the id into the route (`router.setParams`). Reply,
  reply all, forward (`openReply` → `POST /drafts {replyToMessageId, mode}`, one draft per double
  tap) and a cancelled send seed the session with the draft from the answer (no GET); a draft from
  Drafts or from the failed-send toast is loaded with `GET /drafts/{id}`. `Draft.warnings` (for
  example on a forward with the original's attachments, which the server copies) → snackbar.
- **Draft session** (`src/features/compose/session.ts`, a port of silo-web's `DraftSession`, a
  class outside React read through `useSyncExternalStore`): form, `version`/`syncedVersion`,
  `dirty`, save state, `conflict` + `conflictCurrent`, `serverChanged`, `invalid`, uploads. Changes
  stay in memory. `PUT /drafts/{id}` with the edited `version` after 2 s of idle time
  (`composeConfig.autosaveMs`), when the recipients field or the subject loses focus, and with
  `syncNow: true` when the screen is removed (the navigation `removed` event) or the app goes to
  the background. Closing a new, untouched draft deletes it (as Gmail and silo-web do); otherwise
  the last save runs and a "draft saved" toast appears.
- **Conflicts**: `409 draft_version_conflict` keeps the local changes and offers to load the other
  version (`Problem.current`) or overwrite it (save with its version); the same bar appears after a
  `draft.updated` with a newer version from another client (`useCompose.remoteVersions`).
  `Draft.serverChanged` offers to load the version changed in another program. A failed send
  (`Draft.lastSend` or `outbound.status failed` → `useCompose.setFailure` and draft invalidation)
  shows the error in red with the refused recipients.
- **Body**: `@10play/tentap-editor` (TipTap in a WebView, `src/features/compose/Editor.tsx`) with
  the starter kit and a placeholder; every change yields `bodyHtml` and `bodyJson` (TipTap JSON,
  silo-web's format). The server's reply quote is part of the body. The editor grows inside the
  screen's ScrollView (`dynamicHeight`, `useScrollToCaret`); the toolbar (bold, italic, underline,
  lists, link, quote) sits above the keyboard (`EditorKeyboardAvoidingView`).
- **Inline images** (0.4.0): TenTap's `ImageBridge` (`editor.setImage`) shows a data URI read from
  the device (`expo-file-system`); `src/lib/inlineImages.ts` turns it into `cid:` in `bodyHtml`
  and into silo-web's form (`/api/v1/attachments/{u_…}?inline=1` + `cid`) in `bodyJson`. Loaded
  drafts fetch their images with the bearer header and show them unless the user has started
  typing.
- **Send and undo**: Send → the last PUT → `POST /drafts/{id}/send {}` → compose closes, the list
  shows a "sent" snackbar with Undo until `undoUntil` (snackbar timing only). Undo →
  `POST /outbound/{id}/cancel` → compose reopens with the returned `Draft`; 409 → too late, the
  message was sent. Refusals keep compose open: `422 no_recipients`, `invalid_address` (a red chip),
  `413 message_too_large` (with `limit`), `502 upstream_smtp_error` (with `detail`),
  `409 send_in_progress`. The account's lists are invalidated after save, send and cancel.
- **Snackbar**: one toast store; the list renders its snackbar only when it is on top, compose has
  its own above the toolbar, so the "sent · Undo" snackbar appears on the list.

### Stack

- [Expo](https://expo.dev) SDK 58 (React Native 0.88, React 19.3, the new architecture, React
  Compiler), TypeScript `strict`
- [expo-router](https://docs.expo.dev/router/introduction/) (routes in `app/`, `Drawer` on
  `react-native-drawer-layout`, `react-native-gesture-handler` 3, `react-native-reanimated` 4)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) with types from
  [openapi-typescript](https://openapi-ts.dev/) (`src/api/schema.d.ts`)
- [TanStack Query](https://tanstack.com/query), [zustand](https://zustand.docs.pmnd.rs)
  (+ AsyncStorage), `expo-secure-store`, `@react-native-community/netinfo`
- [react-native-paper](https://callstack.github.io/react-native-paper/) 5 (Material 3),
  [FlashList](https://shopify.github.io/flash-list/) 2, `date-fns`, `expo-haptics`
- `react-native-webview`, `@10play/tentap-editor`, `@react-native-community/datetimepicker`,
  `expo-document-picker`, `expo-image-picker`, `expo-file-system`, `expo-sharing`,
  `expo-web-browser`, `expo-linking`
- Tests: `jest-expo`, `@testing-library/react-native` 14, [msw](https://mswjs.io) 3

Why this stack: Expo and React Native let one TypeScript code base target Android first (and iOS
later) without a local Android SDK, and they reuse what silo-web already uses: types generated
from silo-server's OpenAPI with openapi-typescript, requests through openapi-fetch, server state in
TanStack Query and zustand for the rest. react-native-paper provides Material 3 components close
to the Gmail app with little custom styling. The compose editor is TipTap (through tentap in a
WebView), like silo-web's, so a draft's `bodyJson` moves between phone and browser with its
formatting. Tests run under jest-expo with msw, so the real API layer, SSE parser included, is
exercised against mocked HTTP instead of hand-written fakes.

## Screens and endpoints

Routes mirror silo-web's URLs; `<n>` is `Account.position`. API paths are relative to `/api/v1`;
"0.4.0" marks features that need server 0.4.0 or newer.

| Gmail app | silo-mobile (route, screen) | Endpoints |
| --- | --- | --- |
| sign-in | `/login`: instance address, mailbox address, password; server version shown | `GET /meta`, `POST /session {client: bearer}` |
| start (Inbox) | `/` → `/u/<n>/inbox` of `settings.activeAccountId`, else the first account; without accounts: add account | `GET /session` |
| drawer | system views, labels, server folders, create label, settings | `GET /labels?accountId=`, `POST /labels` |
| search bar | menu, search field (→ search), account avatar | – |
| account switcher | dialog from the avatar: accounts with Inbox unread counts, manage accounts, add account, sign out | `GET /labels` per account (while the dialog is open), `PATCH /settings {activeAccountId}` (0.4.0) |
| Compose FAB | `/compose?accountId=…` → `?draftId=d_…` | `POST /drafts {accountId}` |
| thread list | `/u/<n>/<label>` (system slug `inbox`, `starred`, … or `l_<id>`); infinite scroll, pull-to-refresh, sync banners | `GET /threads?accountId=&labelId=&cursor=` (50), `GET /accounts/{id}/sync-status`, `POST /accounts/{id}/resync` |
| swipe | archive / delete / snooze by preference | as the actions above |
| multi-select | long press or avatar → selection bar and ⋮ menu; labels and move-to sheets | `POST /threads/modify\|trash\|untrash\|delete`, `POST /labels` |
| thread | `/u/<n>/<label>/<threadId>`: message cards, body in a WebView, attachments, reply, newer/older arrows | `GET /threads/{id}`, `GET /messages/{id}/html`, `GET /attachments/{id}[?inline=1]`, `/thumbnail` (0.4.0), `POST /messages/modify` |
| reply / forward | reply bar and message menu → compose | `POST /drafts {replyToMessageId, mode}` |
| compose | `/compose?draftId=d_…` (full screen): From, To/Cc/Bcc, subject, body, attachments, ⋮ | `GET/PUT/DELETE /drafts/{id}`, `GET /contacts/autocomplete?q=`, `POST /uploads` |
| send, undo send | "sent" snackbar with Undo until `undoUntil` | `POST /drafts/{id}/send {}`, `POST /outbound/{id}/cancel` |
| undo an action | snackbar Undo until `undoUntil` | `POST /operations/{id}/undo` |
| snooze (0.4.0) | snooze sheet: server presets, custom date and time; from swipe, the selection bar, the thread menu | `GET /snooze/presets`, `POST`/`DELETE /threads/{id}/snooze` |
| Snoozed | rows with the wake time, unsnooze | `DELETE /threads/{id}/snooze` |
| schedule send (0.4.0) | compose ⋮ → sheet with suggestions and a custom date and time | `POST /drafts/{id}/send {sendAt}` |
| Scheduled | rows with a clock and the send time; cancel send in the thread → draft in compose | `POST /outbound/{outboundId}/cancel` |
| Drafts | a row opens `/compose?draftId=d_…` | `GET /drafts/{id}` |
| search | `/u/<n>/search?q=`; result `/u/<n>/search/<threadId>?q=`; history, suggestions, filter chips (0.4.0) | `GET /threads?q=`, `GET /search/suggest?q=&accountId=`, `DELETE /search/history[?query=]` (0.4.0) |
| settings | `/settings`: general settings, accounts, add account, about | `GET /session` |
| – general | `/settings/general`: device section + synced Silo account section (0.4.0) | `GET /settings`, `PATCH /settings` (0.4.0) |
| – account | `/settings/account/<id>`: name, sync, server, password, folders (read-only), filters, labels, remove | `GET /accounts/{id}/sync-status`, `PATCH`/`DELETE /accounts/{id}`, `POST /accounts/{id}/resync` |
| – add account | `/settings/add-account`: one form, test connection, add | `POST /accounts/test`, `POST /accounts` |
| – filters (0.4.0) | `/settings/filters?accountId=`, editor `/settings/filter` | `GET/POST /filters`, `PUT`/`DELETE /filters/{id}`, `POST /filters/{id}/apply` |
| – labels (0.4.0) | `/settings/labels?accountId=`: tree, edit, delete | `GET /labels`, `POST /labels`, `PATCH`/`DELETE /labels/{id}` |
| – devices | `/settings/sessions`: revoke, sign out, sign out everywhere | `GET /sessions`, `DELETE /sessions/{id}`, `DELETE /session` |
| – about | `/settings/about`: app version, `silo.serverRef`, server address and `/meta`, link to the AGPL-3.0 source, sessions, sign out | `GET /meta` |
| (live) | lists, counters, thread and compose refresh without reload | `GET /events` (SSE), `GET /events/poll` |

### Screen notes

- **Drawer** (`src/features/nav`): opened by a swipe from the left edge or the menu button; system
  views in Gmail's order (`src/lib/labels.ts`, a port of silo-web's `SYSTEM_VIEWS`) with counters
  (unread for Inbox and Spam, totals for Scheduled and Drafts, `99+` above 99), user labels (colour
  dot, unread count, children indented), server folders, create label (name; on 0.4.0 also colour
  and parent), settings. The active item sits on an MD3 pill and is announced as selected.
- **List** (`src/features/threadlist/ThreadList.tsx`): an infinite query on FlashList (keyset
  cursor, 50 per page); Gmail-style empty states, an error view with retry. Rows
  (`ThreadRow.tsx`) show the avatar of the last other participant, senders with the message count,
  date, subject, snippet (hidden in compact density), user label chips in their colours, star,
  paperclip, scheduled and snoozed times and a pending-sync clock after 3 s. Heights: 72 dp
  (default), 64 dp (`comfortable`, 0.4.0), 56 dp (compact). TalkBack reads one label per row.
- **Swipe** (`SwipeableRow.tsx`, a custom gesture-handler 3 pan + reanimated 4): the row follows the
  finger over a green (archive) or red (delete) background; released past 40 % of the width it
  slides out and runs that side's action (`swipeLeftAction`/`swipeRightAction`: archive, delete,
  snooze or none) with a haptic tick at the threshold. It activates after 16 dp horizontally and
  fails after 12 dp vertically (list scrolling); a pan started within 32 dp of the left edge opens
  the drawer. No swipe in Trash, Spam or while selecting.
- **Selection** (`SelectionBar.tsx`, `src/state/selection.ts`): long press or tapping the avatar
  selects (the avatar turns into a check mark); the selection bar replaces the search bar with
  archive, delete, snooze (0.4.0), read/unread; Trash offers delete forever, Spam "not spam" and
  delete forever; the ⋮ menu has move to, labels, star/unstar, report spam, restore, unsnooze and
  select all (loaded rows). Back ends selection.
- **Thread** (`src/screens/ThreadScreen.tsx`): the list row from the cache is the
  `placeholderData` (subject and chips at once); 404 → not found. Header with subject, location
  chip, label chips, importance marker and thread star; toolbar actions follow the thread's
  location. After loading, an unread thread is marked read once unless the preference turns it off.
  Message cards (`MessageCard.tsx`): unread and last expanded, the rest collapsed (3+ collapsed
  messages fold into a counter); details, star, reply and a ⋮ menu per message. The reply bar
  targets the last message that is neither a draft nor scheduled; newer/older arrows navigate the
  cached list (in search, the results).
- **Compose** (`src/screens/ComposeScreen.tsx`, a `fullScreenModal`): back (save and close), the
  paperclip (attach files with `expo-document-picker`, insert from the gallery with
  `expo-image-picker`, insert an inline image – 0.4.0), send (enabled with at least one
  recipient), ⋮ (save draft, schedule send – 0.4.0, discard with a confirmation). Fields: From
  (read-only), To with chips, Cc/Bcc, subject, body, attachment tiles with progress.
  `RecipientInput` turns Enter, comma, semicolon, a space after `…@…` or leaving the field into
  chips; pasted lists are split by `src/lib/addresses.ts` (a port from silo-web); suggestions come
  from `GET /contacts/autocomplete?q=` (150 ms debounce, `staleTime` 60 s). A chip is red only for
  an address refused by the server – the app itself checks only "at least one recipient".
- **Search** (`/u/<n>/search`, its own stack so results can be browsed): on 0.4.0 recent searches
  (from the server; no local history), suggestions while typing (150 ms debounce), filter chips
  (labels, from, to, date, attachment, unread, starred) that add or remove query text
  (`src/lib/searchText.ts`), result estimates, notices for `approximate` and `indexing.done < 1`,
  `422` as an invalid-query message and "create filter from this search". On 0.3.0 the field
  searches plain text.
- **Snooze and schedule** (0.4.0): the snooze sheet (`src/features/snooze/SnoozeSheet.tsx`) shows the
  server's presets by `key` with times in the zone from the answer, and a custom date and time
  (`DateTimePickerAndroid.open`, `src/lib/pickDateTime.ts`). N threads = N requests, one Undo
  undoes all N operations; `422 invalid_snooze` and `409 not_in_inbox` are explained; unsnooze has
  no undo (`409 not_snoozed`). Schedule send offers tomorrow morning 8:00, tomorrow afternoon 13:00
  and Monday morning 8:00 (device clock, suggestions only) plus a custom date and time; its
  snackbar with Undo lasts at most 10 s (the message can be cancelled from Scheduled).
- **General settings** (`/settings/general`): device section (theme, list density, swipe actions,
  confirmations before delete/archive, mark as read on open, images ask/always, notifications –
  disabled, no push yet). On 0.4.0 a synced section: density (default/comfortable/compact),
  undo-send delay (5/10/20/30 s), signature (multi-line text dialog), time zone (IANA list from
  `Intl.supportedValuesOf("timeZone")` with search, or a text field without `Intl`). One field per
  `PATCH`, optimistic `setQueryData`; `422 invalid_setting`/`invalid_timezone` → snackbar and the
  previous value. On 0.4.0 the server is the source of density (`useDensity()` copies
  `Settings.density` to `useUi.density`; the device value is never sent). The server stores the
  signature as sanitised HTML; the phone edits it as lines of text (`src/lib/signature.ts`).
- **Account** (`/settings/account/<id>`): name (`PATCH {displayName}`), sync state and counters of
  pending and failed operations, sync now (`incremental`) and full comparison (`full`), server
  details (capabilities, keyword warning, read-only folders, hosts, login, `sentAppend` switch,
  change password = `PATCH {password}`), filters and labels (0.4.0), remove the account from Silo
  (`DELETE`; the user stays signed in, because a Silo session is not tied to a mailbox).
- **Add account** (`/settings/add-account`): address, password, name, advanced (login; servers only
  when `Meta.allowCustomServers`), test connection (`POST /accounts/test`), add (`POST /accounts`,
  422 with the steps).
- **Filters** (0.4.0, a port of silo-web's `FiltersPanel`/`FilterEditor`): list with criteria,
  action chips, an enable switch (PUT of the whole filter, `filterBody()`), ↑/↓ reordering (PUT with
  a new `position`), and an editor with criteria as text plus search chips, a test search, five
  action switches, a label sheet, forward-to, apply to existing messages and delete with a
  confirmation. `422 invalid_query`, `invalid_label` and `invalid_filter` are shown next to the
  fields; apply shows `matchedEstimate` and then the `filter.applied` result.
- **Labels** (0.4.0, a port of `LabelsPanel`): the user label tree with colour dots, counters,
  `keywordState` warnings (`local_only`, `partial` with folder names) and a show-in-navigation
  switch (`show`/`hide`; silo-web's `show_if_unread` shows as on). The edit dialog has name, the 20
  Gmail colours (`src/lib/labelColors.ts`) and a parent (not its own subtree); only changed fields
  are sent.
- **Theme** (`src/lib/theme.ts`): light and dark MD3 palettes tuned to the Gmail app (Google blue as
  primary, a white or `#131314` list background, light blue pill and FAB, Gmail red
  `#C5221F`/`#F28B82` as the `brand` colour of the logo and accents); fixed swipe colours in both
  modes; the system scheme unless chosen otherwise.

## Development

- Routes are files in `app/` (expo-router); screens in `src/screens/`; per-area components and hooks
  in `src/features/`; the API layer in `src/api/`; stores in `src/state/`; pure functions in
  `src/lib/`.
- UI strings, date formats and plural rules are in `src/lib/i18n.ts`, currently **Polish only**
  (`pl-PL` formats). silo-web already has typed English and Polish dictionaries and follows
  `settings.language`; bringing that to the app is planned.
- Icons: `assets/icon.svg` is a copy of `silo-web/public/icons/icon.svg` (keep them identical);
  `npm run gen:icons` regenerates the Expo PNGs referenced by `app.json`.
- Before a pull request run `npm run typecheck && npm run lint && npm run format:check && npm test`
  (the CI `check` job also runs `npm run export:android` with `CI=1`).

### API contract

`src/api/schema.d.ts` is generated from silo-server's `api/openapi.yaml` and committed. The server
release the app is built against is declared in `package.json`: `"silo": {"serverRef": ...}`
(currently `v0.4.0`).

```sh
npm run gen:api                          # openapi.yaml at silo.serverRef (v0.4.0) from GitHub
npm run gen:api -- --server-ref v0.3.0   # another git ref
npm run gen:api -- --local [path]        # a local file (default ../silo-server/api/openapi.yaml)
```

The CI job `api-contract` checks out silo-server at `silo.serverRef`, regenerates the schema and
fails when it differs from the committed one; it passes once the silo-server repository with the
`v0.4.0` tag is public on GitHub. The committed schema is the 0.4.0 contract
(`../silo-server/api/openapi.yaml` at tag `v0.4.0`).

## Testing

```sh
npm test                     # all Jest tests (405 at 0.1.0)
npx jest src/api/sse.test.ts --forceExit   # one file (see the known issues below)
npm run export:android       # Android bundle, the same step as in a release build
npm run smoke:api            # read-only check against a live server (below)
```

Tests talk to the API through [msw](https://mswjs.io) (`setupServer` from `msw/node`,
`src/test/server.ts`). Adjustments for `jest-expo`:

- `jest.environment.js` (jest-expo's Android environment) saves Node's WHATWG `fetch`, `Request`,
  `Response`, `Headers` and `FormData`, and `jest.polyfills.js` restores them after the jest-expo
  setup, which installs Expo's native "winter" fetch – its `Response` does not carry a body built
  in JavaScript, so msw answers would be empty. The API client resolves `globalThis.fetch` on every
  call. (The `undici` package does not work as a replacement: its bodies hang on jest-expo's
  web-streams polyfill.)
- `jest.config.js` makes Babel transform msw and its ES-module-only dependencies (`.mjs` files and
  a few packages) like React Native packages.
- Route tests render the real `app/` tree through expo-router's `renderRouter`
  (`src/test/router.tsx`). `renderRouter` turns on fake timers, under which msw does not answer;
  `fakeTimers.doNotFake` leaves only the clock fake.
- `react-native-reanimated/mock` loads the real library, whose native initialiser throws under the
  Android preset (reanimated 4.7: JSReanimated has no `setCSSEventHandler`); the path is mapped to a
  minimal replacement, `src/test/reanimated-mock.js` (what the drawer uses).
- Mocks: `@10play/tentap-editor` – a fake bridge holding the content as HTML (`typeInEditor` in
  `src/test/editor.ts` calls `onChange`); uploads – a fake `XMLHttpRequest` (`src/test/xhr.ts`
  through `uploadConfig.createXhr`); `react-native-webview` – a View that keeps its props (tests
  read `source.html` and call `onMessage`); `expo-file-system/legacy`, `expo-sharing`,
  `expo-web-browser`, `expo-linking` – mocked per file. `expo-secure-store` and `expo-device` are
  in-memory fakes in `jest.setup.ts`, as are AsyncStorage, NetInfo, gesture-handler, worklets and
  the safe-area insets (library mocks). `jest.setup.ts` also replaces `fetchEventSource` with a
  source that never opens, so screen tests make no SSE requests; `src/api/sse.test.ts` tests the
  real reader on an msw stream, and the `connectEvents`/`useEvents` tests inject a fake through
  `eventsConfig.createEventSource` (short intervals instead of fake timers).
- The list runs on the real FlashList with `@shopify/flash-list/jestSetup` (a fixed 400 × 900
  viewport); tests reach `onEndReached` and `RefreshControl` through the scroll view props. The
  swipe pan is not driven in Jest (gesture-handler does not run native pans); the mapping of
  preferences to actions (`swipeActionFor`) has unit tests, while the gesture and the FAB collapse
  need checking on a device.

### Smoke test against a live API

`npm run smoke:api` (`scripts/smoke-api.mjs`, plain Node `fetch`) checks the client layer against a
running server without a device: a bearer session as in the app, `X-Silo-Client:
silo-mobile/<version>#smoke`, the reads of the start screen, a thread, its HTML (no `<script`) and
events, and on server 0.4.0 or newer (or `dev`) also search, snooze presets, settings and filters.
It is **read-only** – the only changes are creating and deleting its own session. It prints step →
status → ms and counts only (no mail content, no passwords) and exits with 1 on an error.

| Variable | Default | Description |
| --- | --- | --- |
| `SILO_URL` | – | Base URL of silo-server, for example `http://localhost:8080` |
| `SILO_EMAIL`, `SILO_PASSWORD` | – | Mailbox to sign in with |
| `SILO_DEVICE` | `smoke` | Session name |

```sh
SILO_URL=http://localhost:8080 SILO_EMAIL=dev3@silo.test SILO_PASSWORD=devpass3 npm run smoke:api
```

Result on the dev Compose stack on 2026-11-06 (silo-server `dev`, mailbox `dev3@silo.test`): all
steps OK.

| Step | Status | ms | Result |
| --- | --- | --- | --- |
| `GET /meta` | 200 | 78 | `serverVersion` dev, API 1 |
| `POST /session` (`client.kind: bearer`) | 200 | 1014 | bearer token |
| `GET /session` | 200 | 7 | 1 account |
| `GET /accounts` | 200 | 4 | 1 account |
| `GET /labels?accountId=` | 200 | 46 | 11 labels |
| `GET /threads?accountId=&labelId=INBOX&limit=5` | 200 | 15 | 5 threads, ~5000 in the view |
| `GET /threads/{id}` | 200 | 12 | 1 message |
| `GET /messages/{id}/html` | 200 | 8 | 146 characters, no `<script` |
| `GET /events/poll?after=0&limit=1` | 200 | 9 | 1 event |
| `GET /search/suggest?q=te&accountId=` | 200 | 9 | 0 suggestions |
| `GET /snooze/presets` | 200 | 3 | 3 presets, zone UTC |
| `GET /settings` | 200 | 3 | density `default` |
| `GET /filters?accountId=` | 200 | 4 | 0 filters |
| `DELETE /session` | 204 | 10 | session deleted |

The `POST /session` time includes the IMAP sign-in on the mail server. The smoke test does not
check mutations, SSE (`/events`) or rendering – the unit and screen tests do.

### Known test issues

- A single file run in one process (`npx jest <file>`) passes, but Jest does not exit (an open
  handle); add `--forceExit`. `npm test` runs files in workers and exits.
- Paper's `console.warn` "Tried to use the icon '…' … none of the required icon libraries are
  installed" is expected: under jest-expo Paper does not detect `@expo/vector-icons` (icons work in
  the app); it is not a test failure.
- Under heavy machine load single tests with `waitFor` may time out (flaky); a rerun passes.

## Differences from the Gmail app

Compared with the Gmail app and silo-web 0.3.0. Some of them come from gaps in the API contract;
server compatibility is tracked in the
[compatibility matrix](https://github.com/silopost/silo/blob/main/docs/compat-matrix.md) of the
`silo` repository.

List and actions:

- No long-press menu on a row (the Gmail app has none either; long press selects); snooze is
  available from swipe, the selection bar and the thread menu.
- No swipe in Trash and Spam (the preferences know only archive/delete/snooze); the selection bar
  offers delete forever, not spam and (menu) restore instead.
- The labels and move-to sheets cannot be dragged (Paper `Modal`: the scrim, back and the buttons
  close them).
- A label created in the sheet is checked, not applied at once (silo-web applies it at once);
  everything goes in one request after OK, as in Gmail's sheet.
- Read/unread shows a snackbar with Undo (as silo-web; Gmail marks silently).
- Select all selects the loaded rows, not every thread of the label.
- Swipe colours are fixed (green, red), not theme roles.
- No thumbnails in list rows (in no client; a row has no attachment list); avatars are initials,
  not contact photos.

Thread:

- Newer/older arrows at the bottom of the thread instead of an optional swipe between threads (a
  horizontal pan would fight the sideways scrolling of wide mail).
- The message body stays white in dark mode (Gmail darkens it).
- Attachments open through the share sheet, not a built-in viewer.
- No print and no "show original".
- "Mark unread from here" returns to the list without Undo (per-message changes have no undo
  snackbar).

Compose:

- From is read-only (the draft's account is fixed by `POST /drafts`).
- No Undo after discard – a confirmation dialog instead.
- No confidential mode.
- The signature is not inserted into new drafts (the server does not do it; silo-web does it in the
  client); the signature is edited as text, so saving it from the phone loses silo-web's
  formatting.
- The formatting toolbar is always above the keyboard (Gmail shows it only for a text selection).
- The reply quote is part of the editor body (as in silo-web), not Gmail's collapsed "…".
- Contact suggestions come only from addresses known to the server, not from the phone's contacts.
- Scheduled-send presets are computed on the device (Gmail gets them from Google).
- No focus movement between fields (Paper 5's `TextInput` ref type does not fit React Native 0.88).

Search:

- The date chip offers relative ranges and before/after a day instead of Gmail's date range dialog.
- The from/to chips take typed text, without contact suggestions.

Settings:

- One add-account form instead of Gmail's wizard (no provider list – Silo is IMAP/SMTP only).
- No per-account notifications, auto-reply or "sync Gmail" switch; the signature is global only
  (0.4.0); full comparison and the folder list are Silo-specific; sessions replace Google's device
  list.
- No keyboard shortcut setting (`keyboardShortcutsEnabled`; not relevant on a phone) and no
  `conversationView` switch (the app always shows threads).
- The filter editor has no form of advanced fields like silo-web's `AdvancedFieldsForm`; criteria
  are one text field with chips adding `from:`, `to:`, `subject:`, `label:`, `has:attachment`;
  "doesn't have" and size are typed by hand.
- No dragging of filters (only ↑/↓, as in silo-web).
- The comfortable density only on 0.4.0 (two densities on 0.3.0, like Gmail on Android).
- The labels screen manages user labels only; server folders (create, delete, roles, `syncMode`)
  are not managed from the phone.
- Failed operations only as a counter (no list in the API); `rebuild` is not offered (501).
- Notifications are disabled (no push).

Platform:

- The date/time picker is Android-only (`DateTimePickerAndroid`); iOS needs an inline component.
- iOS is unverified (neither a build nor a device); Android is verified only by tests and the
  bundle, not on a device.
- The UI is Polish-only (see [Development](#development)).

## Status and roadmap

Verified on 2026-11-06 without a device: typecheck, lint, format, 405 tests (jest-expo + msw), the
Android Hermes bundle (`expo export`, 8.4 MB), the schema matching `v0.4.0` and the read-only smoke
test on the dev Compose stack (14/14).

Not verified yet: the app **has never run on a device or an emulator** (gestures, the editor
keyboard, WebView, pickers), iOS at all, end-to-end tests with mutations and SSE against a live
API.

Out of scope for 0.1.0, planned:

- **Push**: after sign-in, register the device for the current bearer session (`POST /devices` on
  the server, not implemented yet), unregister on sign-out; the notifications setting becomes
  active. Local notifications for `message.new` (hook point in `applyEvent`) come with push too.
- **Offline cache and `/changes`**: today the cache lives in memory only and after more than 24 h
  offline the server answers `resync`; the plan is `expo-sqlite` for the TanStack Query cache and a
  delta endpoint `GET /changes?cursor=`.
- **Distribution**: signed APK/AAB, stores, F-Droid.
- **English UI** with the typed dictionaries of silo-web.
- Server folder management (roles, `syncMode`), inserting the signature into new drafts.
- Chat, Meet, Spaces and anything unrelated to mail are out of scope (as for all of Silo).

## Contributing

The main contribution guide lives in the
[`silo` repository](https://github.com/silopost/silo/blob/main/CONTRIBUTING.md); see also
[CONTRIBUTING.md](CONTRIBUTING.md). Use Conventional Commits, keep pull requests focused and run the
checks listed under [Development](#development). Testing on a real Android device is the most
valuable contribution right now.

## License

[GNU Affero General Public License v3.0 only](LICENSE) (`AGPL-3.0-only`).
