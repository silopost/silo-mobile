# silo-mobile

Mobile app of [Silopost](https://github.com/silopost/silo), a self-hosted IMAP/SMTP mail client in
the style of Gmail. It is a thin client of the same `/api/v1` as
[silo-web](https://github.com/silopost/silo-web): all domain logic lives in
[silo-server](https://github.com/silopost/silo-server); the app renders state, caches it and does
optimistic updates (plan 2.6). It signs in with an opaque bearer token (ADR 0007) kept in the
Android Keystore / iOS Keychain through `expo-secure-store`. The target look is the Gmail app for
Android (Material 3).

Status: slice 1 – project skeleton, API client and bearer sign-in (login, session list, sign-out).

## Stack

- [Expo](https://expo.dev) SDK 58 (React Native 0.88, new architecture), TypeScript `strict`
- [expo-router](https://docs.expo.dev/router/introduction/) (file-based routes in `app/`)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) with types generated from silo-server's
  OpenAPI contract by [openapi-typescript](https://openapi-ts.dev/) (`src/api/schema.d.ts`)
- [TanStack Query](https://tanstack.com/query) for server state, [zustand](https://zustand.docs.pmnd.rs)
  for the auth state
- [react-native-paper](https://callstack.github.io/react-native-paper/) 5 (Material 3)
- Tests: `jest-expo`, `@testing-library/react-native`, [msw](https://mswjs.io)

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

- `jest.polyfills.js` puts back Node's WHATWG `fetch`, `Request`, `Response`, `Headers` and
  `FormData` (from `undici`). `jest-expo` installs Expo's native-backed "winter" fetch, whose
  `Response` cannot carry a body built in JavaScript, so msw's mocked responses would arrive empty.
  The API client resolves `globalThis.fetch` per call, so it uses the restored one.
- `jest.config.js` lets Babel transform msw and its ES-module-only dependencies (`.mjs` files and a
  few packages) like the React Native packages.

`expo-secure-store` and `expo-device` are replaced by in-memory fakes in `jest.setup.ts`.

## Out of scope (so far)

- Push notifications: hook point for a later slice – register the device for the current bearer
  session with `POST /devices` (plan 5.1, phase 6) after sign-in, and unregister on sign-out.
- Mail views, compose, the Gmail theme: later slices.

## License

[AGPL-3.0-only](LICENSE)
