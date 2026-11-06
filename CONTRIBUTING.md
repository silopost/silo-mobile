# Contributing to silo-mobile

The main contributing guide lives in the
[`silo` repository](https://github.com/silopost/silo/blob/main/CONTRIBUTING.md). These are the
rules specific to this repository.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) in English (`feat:`, `fix:`,
  `docs:`, `chore:`, `test:`, `refactor:`, optionally with a scope: `feat(compose): …`); title at
  most 72 characters, the body says what changed and why.
- Keep commits small: one closed step each, and every commit passes `npm run typecheck`. Commit a
  regenerated schema and `package-lock.json` changes separately (`chore:`).
- Before opening a PR run `npm run typecheck && npm run lint && npm test` (CI also runs
  `format:check` and `expo export --platform android`). Keep PRs focused and describe the
  user-visible change.

## API contract

- The app is a thin client of silo-server's `/api/v1`: **no domain logic in the client**
  ([plan 2.6](https://github.com/silopost/silo/blob/main/ARCHITECTURE_AND_PLAN.md#26-klienci-api)).
  Undo windows, draft autosave and deduplication, search parsing and suggestions, snooze and
  scheduled send, filters and the pending-operation queue belong to the server; the app renders,
  caches and updates optimistically. If a feature needs a decision the server does not offer, add
  it to `docs/NOTES-FOR-SILO.md` as a contract gap instead of implementing it locally.
- No hand-written DTOs: use the types generated into `src/api/schema.d.ts`.
- When bumping `silo.serverRef` in `package.json`, run `npm run gen:api` (or
  `npm run gen:api -- --local ../silo-server/api/openapi.yaml`) and commit the schema in the same
  PR; the `api-contract` CI job fails when they differ. Gate features of a newer server in
  `src/lib/features.ts`.
- Add native dependencies with `npx expo install <package>` so they match the Expo SDK, and prefer
  modules that run in Expo Go.

## Tests

- Hooks, queries, mutations and screens are tested against [msw](https://mswjs.io) handlers
  (`src/test/server.ts`), not by mocking the API client; routes through `renderRouter`
  (`src/test/router.tsx`). Pure helpers in `src/lib` get unit tests.
- Run a single file with `npx jest <file> --forceExit`.

## Accessibility

- Touch targets are at least 48 × 48 dp (use `hitSlop` where the visible control is smaller).
- Every icon-only control has an `accessibilityLabel` (in Polish, like the UI) and the right
  `accessibilityRole`; selected and checked states are announced (`accessibilityState`). A list
  row reads as one label.
