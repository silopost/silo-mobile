# silo-mobile

Mobile app of [Silopost](https://github.com/silopost/silo), a self-hosted IMAP/SMTP mail client in
the style of Gmail. It is a thin client of the same `/api/v1` as
[silo-web](https://github.com/silopost/silo-web): all domain logic lives in
[silo-server](https://github.com/silopost/silo-server); the app renders state, caches it and does
optimistic updates (plan 2.6). It signs in with an opaque bearer token (ADR 0007) kept in the
Android Keystore / iOS Keychain through `expo-secure-store`. The target look is the Gmail app for
Android (Material 3).

Status: slice 5 – server events (SSE over fetch with a polling fallback, AppState lifecycle,
offline banner). Slice 4: thread actions with optimistic update and "Cofnij" (swipes, star,
selection bar, "Etykiety" and "Przenieś do" sheets, creating labels). Slice 3: the Gmail thread list (rows,
swipe, multi-select, pull-to-refresh, sync banners); slice 2: the Gmail shell (routes, drawer,
search bar, account switcher, compose FAB, theme); slice 1: API client and bearer sign-in.

## Stack

- [Expo](https://expo.dev) SDK 58 (React Native 0.88, new architecture), TypeScript `strict`
- [expo-router](https://docs.expo.dev/router/introduction/) (file-based routes in `app/`)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) with types generated from silo-server's
  OpenAPI contract by [openapi-typescript](https://openapi-ts.dev/) (`src/api/schema.d.ts`)
- [FlashList](https://shopify.github.io/flash-list/) 2 for the thread list, `date-fns` (`pl`
  locale) for list dates, `expo-haptics` for the swipe threshold tick
- [TanStack Query](https://tanstack.com/query) for server state, [zustand](https://zustand.docs.pmnd.rs)
  for the auth state and the device preferences (persisted to AsyncStorage)
- `@react-native-community/netinfo` for TanStack Query's `onlineManager` and reconnecting the
  event stream when the network comes back
- expo-router's `Drawer` (its bundled react-navigation drawer on `react-native-drawer-layout`,
  `react-native-gesture-handler`, `react-native-reanimated`)
- [react-native-paper](https://callstack.github.io/react-native-paper/) 5 (Material 3)
- Tests: `jest-expo`, `@testing-library/react-native`, [msw](https://mswjs.io)

## Mapowanie Gmail → ekrany

Routes mirror silo-web's URLs (plan 6.2); `<n>` is `Account.position`.

| Gmail app             | silo-mobile                                                        |
| --------------------- | ------------------------------------------------------------------ |
| start (Inbox)         | `/` → `/u/<n>/inbox` of `settings.activeAccountId`, else the first |
| label list            | `/u/<n>/<label>`: system slug (`inbox`, `starred`, …) or `l_<id>`  |
| draft (Drafts view)   | `/compose?draftId=d_…` (placeholder, slice 7)                      |
| thread                | `/u/<n>/<label>/<threadId>` (placeholder, slice 6)                 |
| search                | `/u/<n>/search` (placeholder)                                      |
| compose (full screen) | `/compose` (placeholder, slice 7)                                  |
| settings              | `/settings` (theme), `/settings/sessions`                          |

- **Drawer** (`src/features/nav`): opened by a swipe from the left edge or the menu button.
  Logotype, system views in Gmail's order (`src/lib/labels.ts`, a port of silo-web's
  `SYSTEM_VIEWS`) with counters from `GET /labels` (unread: Inbox, Spam; total: Scheduled,
  Drafts; `99+` above 99), "Etykiety" with the user's labels (colour dot, unread counter),
  server folders, "Utwórz nową" (a name-only dialog, `POST /labels`), "Ustawienia", "Pomoc i opinie" (disabled). The active
  entry sits on an MD3 pill (`secondaryContainer`, rounded right end) and is announced as
  selected.
- **Search bar** (`src/features/topbar`): floating rounded field (`surfaceContainerHigh`) with the
  menu button, "Szukaj w poczcie" (opens search) and the account avatar (initial on a colour
  hashed from the address). Outside the Inbox a section title names the label above the list.
- **Accounts** (`src/features/accounts`): the avatar opens the account dialog – current account,
  "Zarządzaj kontami" (settings), the other accounts by position with unread Inbox counters (one
  `GET /labels` each, fetched only while the dialog is open), "Dodaj konto" (slice 8), sign-out.
  Choosing an account opens `/u/<position>/inbox`.
- **FAB** (`src/features/shell`): extended "Utwórz" with a pencil, bottom right, opens
  `/compose`; folded to the pencil while the list scrolls down, extended again on scrolling up
  or at the top, as in Gmail.
- **Thread list** (`src/features/threadlist/ThreadList.tsx`): `GET /threads` of the label as an
  infinite query (keyset cursor, 50 per page, `src/api/queries/threads.ts`) on FlashList; the
  next page loads near the end with a spinner below the last row. Pull-to-refresh refetches the
  list and the label counters. Empty views as in Gmail ("Brak wiadomości w Odebranych", "Brak
  spamu", "Kosz jest pusty", otherwise "Nic tu nie ma") with a large icon; an error view with
  "Spróbuj ponownie"; a spinner on the first load.
- **Row** (`ThreadRow.tsx`): avatar of the last participant who is not the user (the account's
  for a thread of one's own messages), senders (one full name, else up to three short names,
  "ja" for the user) with the message count, date ("09:12" today, "4 lis" this year,
  "04.11.2025" before), subject (or "(bez tematu)"), snippet (hidden in the compact density),
  user label chips in their colours (not the chip of the open label), star toggle, paperclip,
  clock for Scheduled, and the pending clock after 3 s of `pendingSync`. Unread rows are bold
  on the plain surface, read rows on the tinted one. TalkBack reads one label per row
  ("Nieprzeczytane, Jan Kowalski, Oferta na Q4, 09:12, załącznik").
- **Swipe** (`SwipeableRow.tsx`): a row follows the finger over a green archive or red delete
  background; released past 40 % of its width it slides out and runs the action of that side
  (device preferences `swipeLeftAction`/`swipeRightAction`, `src/state/ui.ts`), with a haptic
  tick at the threshold. No swipes in Trash and Spam, nor while selecting. A pan starting in
  the 32 dp left edge opens the drawer instead.
- **Multi-select** (`SelectionBar.tsx`, `src/state/selection.ts`): a long press or a tap on the
  avatar selects (the avatar turns into a check mark), further taps toggle rows; the search
  bar gives way to the selection bar – close and count, archive, delete, mark read/unread
  (restore and delete forever in Trash and Spam), and ⋮ with "Przenieś do", "Etykiety",
  "Oznacz gwiazdką", "Zgłoś spam", "Zaznacz wszystko". Back ends the selection.
- **Banners** (`src/features/sync/Banners.tsx`): above the list, from
  `GET /accounts/{id}/sync-status` (polled every 15 s while the account is not live): a
  rejected mailbox password ("Zaktualizuj hasło" opens settings), an unreachable mail server
  with the pending changes and "Ponów teraz" (`POST /accounts/{id}/resync`), and the progress
  of the initial sync.
- **Actions** (`src/features/threadlist/actions.ts`): rows, swipes and the selection bar call
  `useThreadActions().run(action, ids, opts)`, implemented by `ThreadActionsRoot` around the
  account's drawer with `runThreadAction` (`src/api/mutations/threads.ts`, see below). Without a
  choice, `run('labels')` opens the "Etykiety" sheet, `run('moveTo')` the "Przenieś do" sheet and
  `run('deleteForever')` a confirmation ("Tej operacji nie można cofnąć"), so the thread screen
  of a later slice gets the same flows.
- **Selection bar**: archive, delete, read/unread (unread once every selected thread is read);
  in Trash delete forever (restore in the menu), in Spam "To nie spam" and delete forever.
  Menu ⋮: "Przenieś do", "Etykiety", star/unstar (unstar once all are starred), "Zgłoś spam"
  (not in Spam/Trash), "Przywróć z kosza" (Trash), "Zaznacz wszystko" (loaded rows).
- **Sheets** (`src/features/labels`): MD3 modal bottom sheets on Paper's `Modal`
  (`src/components/BottomSheet.tsx`, no drag-to-dismiss). "Etykiety": user labels as checkboxes
  (all / some / none of the threads), "Nowa etykieta" (`POST /labels`, checked at once), changes
  sent as one modify after "OK". "Przenieś do": Odebrane, Spam, Kosz, Archiwum, server folders,
  user labels; the current place greyed out.
- **Snackbar** (`src/state/toasts.ts`, `src/features/toasts/Snackbar.tsx`): one at a time above
  the FAB, a newer one replaces the shown one; an undoable action shows "Cofnij" until the
  server's `undoUntil`.

### Actions → endpoints (plan 4.4, 5.2, 6.5)

| Action                              | Request                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| archive                             | `POST /threads/modify` `-INBOX` (folder view: `-<folder>`; user label view: `-INBOX -<label>`) |
| delete; "Kosz" in "Przenieś do"     | `POST /threads/trash`                                                                          |
| restore from Trash                  | `POST /threads/untrash`                                                                        |
| delete forever (after confirmation) | `POST /threads/delete` (no undo)                                                               |
| report spam / not spam              | modify `+SPAM` / `-SPAM`                                                                       |
| read / unread                       | modify `-UNREAD` / `+UNREAD`                                                                   |
| star / unstar (no snackbar)         | modify `+STARRED` / `-STARRED`                                                                 |
| labels (sheet, after OK)            | modify with the added and removed user labels, one request                                     |
| move to Inbox / Spam / folder       | modify `+<target>` (the server leaves the old location)                                        |
| move to a user label                | modify `+<label> -INBOX` (as Gmail)                                                            |
| move to Archiwum                    | as archive                                                                                     |
| Cofnij                              | `POST /operations/{id}/undo`                                                                   |

Each action snapshots the cached lists, labels and open threads, applies the change locally (the
row leaves a list it no longer belongs to, label counters follow, as in silo-web), sends the
request and writes the returned threads over the cache. The snackbar names the result with
"Cofnij" until `undoUntil`; pressing it restores the snapshot at once and calls the undo
endpoint, whose answer is merged (409 `undo_expired` → "Tej operacji nie można już cofnąć.").
No local timer decides about undo and no inverse modify is sent (plan 2.6). On an error the
snapshot comes back with "Nie udało się. Spróbuj ponownie."; once no thread operation is in
flight the lists and labels are refetched. Operations on the same threads are serialised (the
mutation `scope`). `handleOperationFailed` (snapshot from the in-memory `recentOps`, message by
`kind`) and `isThreadOpRunning` wait for the SSE handling of slice 5.

- **Theme** (`src/lib/theme.ts`): MD3 light and dark palettes tuned to the Gmail app (Google blue
  primary, white or `#131314` list background, light-blue pill and FAB, Gmail red for the
  logotype); system colour scheme unless overridden in settings. Device preferences (theme, swipe
  actions, density) live in `src/state/ui.ts` (zustand + AsyncStorage).

## Zdarzenia: SSE, polling, AppState

Server events (plan 3.14, 5.4) keep the cache current without refetching:

- **Stream.** `src/api/sse.ts` opens `GET /api/v1/events` with `fetch` and parses
  `text/event-stream` incrementally. React Native has no `EventSource`; Expo SDK 58's global
  `fetch` is `expo/fetch`, whose `Response.body` is a `ReadableStream` filled as data arrives.
  Every attempt sends `Authorization: Bearer <token>`, `X-Silo-Client` (the same `clientId()` as
  REST, so the app recognises its own events by `origin`) and, on reconnect, `Last-Event-ID`
  as a header. The token is never put in the URL (ADR 0007). A stream silent for 60 s (the
  server pings every 25 s) is treated as dead and reopened.
- **Reconnect and fallback** (`connectEvents` in `src/api/events.ts`, settings in
  `eventsConfig`): a failed or dropped stream reconnects after 1 s, 2 s, ... (capped at 30 s);
  after 3 failures in a row the app polls `GET /events/poll?after=<lastId>` every **15 s** (plan
  3.14; silo-web polls every 5 s, a phone saves battery) and tries SSE again every 5 min. The
  first poll without a position skips the retained backlog and refetches everything. A failing
  stream is followed by a `GET /meta` probe: if Silo does not answer, the state is `offline`.
  A 401 from the stream does not loop: it stops and signs out like the REST client.
- **Mapping** (`applyEvent`, a port of silo-web's): `thread.updated` patches rows and the open
  thread (lists refetch when the thread is new or moved), `label.counts` writes counters into
  `/labels`, `operation.failed` rolls back through `handleOperationFailed`, `draft.updated`
  stores the remote version in `src/state/compose.ts` for the compose screen,
  `outbound.status: failed` shows "Nie udało się wysłać · Otwórz" (opens `/compose?draftId=`),
  account events refetch the sync status and session, `resync` refetches everything. The app's
  own `thread.updated` (`origin` = its `X-Silo-Client`) is ignored while a thread operation is
  in flight. `message.new` only refetches lists (no local notification; push is phase 6).
- **App lifecycle** (`src/features/sync/useEvents.ts`, mounted once in `app/(app)/_layout.tsx`):
  the stream is open only while signed in and in the foreground. `background`/`inactive` close
  the stream or polling; coming back reconnects with `Last-Event-ID` and invalidates the lists,
  labels and sync status as a safety net (the web's `refetchOnWindowFocus`). Network back
  (NetInfo) reconnects at once. Signing out disconnects and forgets the last event id. The root
  layout feeds TanStack Query's `focusManager` from `AppState` and `onlineManager` from NetInfo.
- **Connection state** (`src/state/connection.ts`: `connecting | live | polling | offline`): the
  list shows "Brak połączenia z Silo. Ponawiam…" when `offline`, nothing while polling. The sync
  status of a non-live account is polled every 15 s only while events are polled or offline.

After more than 24 h without the stream (the retention of `events`), the server answers `resync`
and the app refetches every query; the delta endpoint `GET /changes` of phase 5 would replace
that.

## Running

Requirements: Node 22+ (`.nvmrc`), a running silo-server (see the `silo` repository for the dev
stack) reachable from the phone.

```sh
npm ci
npm start          # Expo dev server; scan the QR code with Expo Go
npm run android    # same, and open it on a connected device or a running emulator
```

On the sign-in screen enter the address of your Silo instance (e.g. `https://mail.example.com`
or, in the dev stack, `http://<your-computer's-LAN-IP>:<port>`; `localhost` on the phone is the
phone itself), then your mailbox address and password.

- **Expo Go** runs the app without any Android SDK: install Expo Go on the phone and scan the QR
  code from `npm start`. All native modules used so far are part of Expo Go.
- **Development build / emulator**: requires the Android SDK (Android Studio, `adb`, an AVD).
  `npx expo run:android` generates `android/` (continuous native generation, not committed) and
  installs a debug build on the emulator. A release APK, e.g. for F-Droid, is built the same way
  from the prebuilt project (`npx expo prebuild`, then Gradle); there is no EAS project.

The machine this slice was written on has no Android SDK, so the evidence that the app works is
the CI checks: `npm run typecheck`, `npm run lint`, `npm test` and `npm run export:android`
(bundles the JavaScript for Android into `dist/`, the same step a release build runs).

## Scripts

| Script                            | What it does                                  |
| --------------------------------- | --------------------------------------------- |
| `npm start` / `npm run android`   | Expo dev server (Android: also opens the app) |
| `npm run typecheck`               | `tsc --noEmit`                                |
| `npm run lint`                    | ESLint (`eslint-config-expo`, flat config)    |
| `npm run format` / `format:check` | Prettier                                      |
| `npm test`                        | Jest (`jest-expo` preset for Android)         |
| `npm run gen:api`                 | regenerate `src/api/schema.d.ts` (see below)  |
| `npm run export:android`          | `expo export --platform android` into `dist/` |

## API contract

`src/api/schema.d.ts` is generated from silo-server's `api/openapi.yaml` and committed. The server
release the app is built against is declared in `package.json` as `"silo": {"serverRef": ...}`.

```sh
npm run gen:api                          # fetch openapi.yaml of silo.serverRef from GitHub
npm run gen:api -- --server-ref v0.3.0   # another git ref
npm run gen:api -- --local [path]        # a local file (default ../silo-server/api/openapi.yaml)
```

The `api-contract` CI job checks out silo-server at `silo.serverRef`, regenerates the schema and
fails when it differs from the committed one.

## Tests

Tests talk to the API through [msw](https://mswjs.io) (`setupServer` from `msw/node`, see
`src/test/server.ts`). Two adjustments make msw work under `jest-expo`:

- `jest.environment.js` (jest-expo's Android environment) saves Node's WHATWG `fetch`, `Request`,
  `Response`, `Headers` and `FormData`, and `jest.polyfills.js` puts them back after jest-expo's
  setup. That setup installs Expo's native-backed "winter" fetch, whose `Response` cannot carry a
  body built in JavaScript, so msw's mocked responses would arrive empty. The API client resolves
  `globalThis.fetch` per call, so it uses the restored one. (The `undici` npm package does not work
  as a replacement here: its bodies hang on jest-expo's web-streams polyfill.)
- `jest.config.js` lets Babel transform msw and its ES-module-only dependencies (`.mjs` files and a
  few packages) like the React Native packages.

`expo-secure-store` and `expo-device` are replaced by in-memory fakes in `jest.setup.ts`, as are
AsyncStorage, NetInfo, gesture-handler, worklets and the safe-area insets (the libraries' jest
mocks). `jest.setup.ts` also replaces `fetchEventSource` with a source that never opens, so
screen tests make no SSE requests; `src/api/sse.test.ts` tests the real one against an msw
stream, and the `connectEvents`/`useEvents` tests inject a fake through
`eventsConfig.createEventSource` (short intervals instead of fake timers, which
`fakeTimers.doNotFake` leaves real).

Route tests render the real `app/` tree with expo-router's `renderRouter`
(`src/test/router.tsx`). Two more adjustments make that work:

- `renderRouter` turns on fake timers, under which msw never answers; `jest.config.js` sets
  `fakeTimers.doNotFake` so fake timers only freeze the clock.
- `react-native-reanimated/mock` loads the real library, whose native initializer throws under
  jest-expo's Android preset (reanimated 4.7: JSReanimated has no `setCSSEventHandler`). The
  path is mapped to a minimal stand-in, `src/test/reanimated-mock.js`, covering what the drawer
  uses.

The thread list renders on the real FlashList with the library's jest setup
(`@shopify/flash-list/jestSetup` in `jest.setup.ts`: a fixed 400 x 900 viewport). Tests reach
`onEndReached` and the `RefreshControl` through the props of FlashList's scroll view. The swipe
pan is not driven in jest (gesture-handler's jest setup runs no native pans); the mapping of
preferences to actions (`swipeActionFor`) is unit-tested, the gesture and the FAB folding are
checked on a device.

Known: a single test file run in band (`npx jest <file>`) passes, but jest does not exit
afterwards (an open handle that already existed in slice 1); `npm test` runs the files in
workers and finishes. Add `--forceExit` when running one file.

## Out of scope (so far)

- Push notifications: hook point for a later slice – register the device for the current bearer
  session with `POST /devices` (plan 5.1, phase 6) after sign-in, and unregister on sign-out.
- Thread, search, compose, label management (colours, rename, delete), account setup: later
  slices.
- Local notifications for `message.new` (hook point in `applyEvent`); system push is phase 6.

## License

[AGPL-3.0-only](LICENSE)
