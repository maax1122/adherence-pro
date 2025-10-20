# Repository Guidelines

## Project Structure & Module Organization
- `medication-tracker-app/` is the Expo React Native client. Core code lives in `src/` (`config/`, `services/`, `types/`), while UI assets reside in `assets/`. Mobile tests sit in `tests/` (unit, integration, contract) with Detox flows under `e2e/`.
- `medication-tracker-web/` is the Vite React portal. UI code lives in `src/`, shared mocks and integration specs in `tests/`, and static assets in `public/`.
- Cross-surface specs are stored in `specs/001-medication-family-tracker`, and shared automation lives in `scripts/` (e.g., `scripts/setup-firebase.sh`). Repository-wide contract assertions are in `tests/contract/`.

## Build, Test, and Development Commands
- Mobile: `cd medication-tracker-app && npm install && npm run start` boots the Expo dev server; append `--android`, `--ios`, or `--web` for targeted platforms.
- Web: `cd medication-tracker-web && npm install && npm run dev` launches Vite with hot reload.
- Quality gates: `npm run lint`, `npm run format:check`, and `npm run type-check` (mobile) or `npm run lint`, `npm run build` (web) must pass before opening a PR.

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer strict typings and discriminated unions for state. Follow ESLint + Prettier defaults (2-space indent, single quotes where configured, trailing commas). Run `npm run lint:fix` or `npm run format` to auto-resolve style issues.
- Use PascalCase for React components, camelCase for functions/variables, and kebab-case for file names (e.g., `authService.ts`, `medication-card.tsx`). Organize modules by feature folder rather than layer sprawl.

## Testing Guidelines
- Mobile: `npm run test` executes Jest; use `npm run test:unit`, `test:integration`, or `test:contract` to scope suites, and `npm run test:coverage` before merging. Detox scenarios (`npm run test:e2e:ios` / `test:e2e:android`) must stay green when flows change.
- Web: `npm run test` (Vitest) with optional `npm run test:integration` and `test:coverage`. Add snapshots only when exercising UI states not easily asserted semantically.
- Keep new tests beside implementation (`src/**/__tests__`) and mirror spec IDs in describe blocks for traceability.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(web):`, `docs:`, `fix(app):`). Scope should reflect the affected surface; squash incidental refactors into `chore:` entries.
- PRs require: clear summary with acceptance criteria, linked spec/task (`W###`), screenshots or recordings for UI updates, and notes on test coverage (commands run, devices used). Draft early, request reviews after lint, type-check, and tests succeed.

## Security & Configuration Tips
- Store Firebase keys via environment variables; avoid committing `.env*` files. Before running locally, complete `FIREBASE_SETUP.md` and sync Firestore rules with `firebase deploy --only firestore:rules` when changes land.
- Review `scripts/setup-firebase.sh` before use and run it in a sandboxed project first to validate IAM permissions.
