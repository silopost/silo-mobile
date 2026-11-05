# Contributing to silo-mobile

The main contributing guide lives in the
[`silo` repository](https://github.com/silopost/silo/blob/main/CONTRIBUTING.md). This is a short summary.

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:` ...).
- Run `npm run typecheck && npm run lint && npm test` before opening a PR (CI also runs
  `format:check` and `expo export --platform android`).
- The app is a thin client of silo-server's `/api/v1` (plan 2.6): no domain logic in the app and
  no hand-written DTOs; use the types generated into `src/api/schema.d.ts` (`npm run gen:api`).
  Commit a regenerated schema separately (`chore:`), as well as `package-lock.json` changes.
- Add native dependencies with `npx expo install <package>` so that they match the Expo SDK.
- Keep PRs focused and describe the user-visible change.
