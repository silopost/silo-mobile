# silo-mobile

Mobile app of [Silopost](https://github.com/silopost/silo), a self-hosted IMAP/SMTP mail client in
the style of Gmail. It is a thin client of the same `/api/v1` as
[silo-web](https://github.com/silopost/silo-web): all domain logic lives in
[silo-server](https://github.com/silopost/silo-server); the app renders state, caches it and does
optimistic updates (plan 2.6). It signs in with an opaque bearer token (ADR 0007) kept in the
Android Keystore / iOS Keychain through `expo-secure-store`. The target look is the Gmail app for
Android (Material 3).

Status: slice 2 – the Gmail shell: routes per account, navigation drawer, search bar, account
switcher, compose FAB and the Gmail theme (slice 1: API client and bearer sign-in).

## Stack

- [Expo](https://expo.dev) SDK 58 (React Native 0.88, new architecture), TypeScript `strict`
- [expo-router](https://docs.expo.dev/router/introduction/) (file-based routes in `app/`)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) with types generated from silo-server's
  OpenAPI contract by [openapi-typescript](https://openapi-ts.dev/) (`src/api/schema.d.ts`)
- [TanStack Query](https://tanstack.com/query) for server state, [zustand](https://zustand.docs.pmnd.rs)
  for the auth state and the device preferences (persisted to AsyncStorage)
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
| thread                | `/u/<n>/<label>/<threadId>` (placeholder, slice 6)                 |
| search                | `/u/<n>/search` (placeholder)                                      |
| compose (full screen) | `/compose` (placeholder, slice 7)                                  |
| settings              | `/settings` (theme), `/settings/sessions`                          |

- **Drawer** (`src/features/nav`): opened by a swipe from the left edge or the menu button.
  Logotype, system views in Gmail's order (`src/lib/labels.ts`, a port of silo-web's
  `SYSTEM_VIEWS`) with counters from `GET /labels` (unread: Inbox, Spam; total: Scheduled,
  Drafts; `99+` above 99), "Etykiety" with the user's labels (colour dot, unread counter),
  server folders, "Utwórz nową" (slice 4), "Ustawienia", "Pomoc i opinie" (disabled). The active
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
  `/compose`; its `extended` prop folds it to the icon (driven by the list's scrolling in
  slice 3).
- **Theme** (`src/lib/theme.ts`): MD3 light and dark palettes tuned to the Gmail app (Google blue
  primary, white or `#131314` list background, light-blue pill and FAB, Gmail red for the
  logotype); system colour scheme unless overridden in settings. Device preferences (theme, swipe
  actions, density) live in `src/state/ui.ts` (zustand + AsyncStorage).

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
AsyncStorage, gesture-handler, worklets and the safe-area insets (the libraries' jest mocks).

Route tests render the real `app/` tree with expo-router's `renderRouter`
(`src/test/router.tsx`). Two more adjustments make that work:

- `renderRouter` turns on fake timers, under which msw never answers; `jest.config.js` sets
  `fakeTimers.doNotFake` so fake timers only freeze the clock.
- `react-native-reanimated/mock` loads the real library, whose native initializer throws under
  jest-expo's Android preset (reanimated 4.7: JSReanimated has no `setCSSEventHandler`). The
  path is mapped to a minimal stand-in, `src/test/reanimated-mock.js`, covering what the drawer
  uses.

Known: a single test file run in band (`npx jest <file>`) passes, but jest does not exit
afterwards (an open handle that already existed in slice 1); `npm test` runs the files in
workers and finishes. Add `--forceExit` when running one file.

## Out of scope (so far)

- Push notifications: hook point for a later slice – register the device for the current bearer
  session with `POST /devices` (plan 5.1, phase 6) after sign-in, and unregister on sign-out.
- Thread list, thread, search, compose, label management, account setup: later slices.

## License

[AGPL-3.0-only](LICENSE)
