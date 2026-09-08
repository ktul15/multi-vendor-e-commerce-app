# Repository Guidelines

## Project Structure & Module Organization

This repository contains four applications:

- `backend/`: Express 5 + TypeScript REST API with Prisma, PostgreSQL, Redis, Stripe, Firebase, and Zod.
- `storefront/`: Flutter customer shopping app.
- `vendor_dashboard/`: Flutter vendor management app.
- `admin_panel/`: Flutter admin app.

Backend features live under `backend/src/modules/<feature>/` with `<feature>.routes.ts`, `<feature>.controller.ts`, `<feature>.service.ts`, and `<feature>.validation.ts`. Prisma files are in `backend/prisma/`. Flutter source lives in each app's `lib/`, tests in `test/`, and declared assets in `assets/`.

## Build, Test, and Development Commands

Run backend commands from `backend/`:

- `npm run dev`: start the API with hot reload.
- `npm run build`: compile TypeScript to `dist/`.
- `npm test`: run Jest tests.
- `npm run test:coverage`: run Jest with coverage.
- `npm run lint` / `npm run format:check`: check ESLint and Prettier.
- `npm run db:migrate`, `npm run db:seed`, `npm run prisma:generate`: manage Prisma state.

Run Flutter commands from the relevant app directory:

- `flutter pub get`: install Dart dependencies.
- `flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1`: run against the local backend.
- `flutter test`: run unit and widget tests.
- `flutter analyze`: run Dart static analysis.
- `dart format .`: format Dart files.

## Coding Style & Naming Conventions

Backend code uses TypeScript, ESLint, and Prettier. Keep controllers thin, put business logic in services, and validate request shapes with Zod in `*.validation.ts`. Use names that match existing modules, such as `product.service.ts`.

Flutter code uses `flutter_lints` and BLoC/Cubit patterns. Prefer `snake_case.dart` filenames, `PascalCase` classes, and feature folders such as `features/cart/bloc/` or `features/auth/view/`.

## Testing Guidelines

Backend tests use Jest, Supertest, and `ts-jest`. Place integration tests in `backend/__tests__/integration/`, unit tests in `backend/__tests__/unit/`, or module tests under `backend/src/__tests__/`. Use `*.test.ts`.

Flutter tests use `flutter_test`, with `bloc_test` and `mocktail` where needed. Keep tests under each app's `test/` tree and name files `*_test.dart`.

## Commit & Pull Request Guidelines

Git history uses conventional commit style, for example `feat(storefront): add app icon` and `fix(server): detect DB/Redis down at startup`. Keep commits scoped and imperative.

Pull requests should include a clear summary, linked issue when applicable, test results, and screenshots or screen recordings for UI changes. Note any required environment, migration, or seed-data changes.

### Required Git Flow for Every Issue

The branch hierarchy is `feature/*` → `dev` → `main`.

1. Always create a new feature branch from `dev`, never from `main`.
2. Use the branch name `feature/<issue-number>-<short-description>`, for example `feature/21-product-filters`.
3. Never commit directly to `dev` or `main`.
4. Use Conventional Commits: `feat(scope): description`, `fix(scope): description`, `docs(scope): description`, and so on.
5. Include `Closes #<issue-number>` in the commit body so GitHub closes the issue when the commit reaches the default branch.
6. When implementation and verification are complete, merge the feature branch into `dev` using a non-fast-forward merge.
7. Push `dev`, then close the GitHub issue with a short comment naming the feature branch and `dev` as the merge target.
8. Update `main` only by merging `dev`; never commit to `main` directly.

Starting an issue:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<issue-number>-<short-description>
```

Finishing an issue:

```bash
git checkout dev
git merge --no-ff feature/<issue-number>-<short-description>
git push origin dev
gh issue close <issue-number> --comment "Resolved in feature/<issue-number>-<short-description>, merged into dev."
```

Do not merge, push, or close an issue until its acceptance criteria are satisfied and its required tests pass.

### Required GitHub Project Workflow

Every issue must be tracked in GitHub Project #2 (`multi-vendor-e-commerce-app`). If an issue is not yet present, add it before changing its status.

- When starting an issue, move its project card to **In Progress**.
- After merging into `dev` and closing the issue, move its project card to **Done**.

Project reference values:

- Owner: `ktul15`
- Project number: `2`
- Project node ID: `PVT_kwHOAcao0M4BQZKp`
- Status field ID: `PVTSSF_lAHOAcao0M4BQZKpzg-hsng`
- `In Progress`: `47fc9ee4`
- `Done`: `98236657`
- `Ready`: `61e4505c`
- `Backlog`: `f75ad846`

Locate and update an item with:

```bash
gh project item-list 2 --owner ktul15 --format json
gh project item-edit --project-id PVT_kwHOAcao0M4BQZKp \
  --id <item-id> \
  --field-id PVTSSF_lAHOAcao0M4BQZKpzg-hsng \
  --single-select-option-id <status-option-id>
```

### Mandatory Review Before Committing

Before every issue commit:

1. Run the `senior-code-reviewer` agent against every changed file intended for the issue commit.
2. List every issue and suggestion it reports, with a short description of each.
3. Ask the user which findings to fix before proceeding.
4. Do not commit until the user has answered and the selected findings have been addressed.

Keep unrelated user changes out of the review, staging area, commit, and merge.

### Mandatory Completion Summary

After merging the feature into `dev`, pushing `dev`, closing the GitHub issue, and moving its project card to **Done**, provide a written summary containing:

- **Why**: the business or product reason for the work.
- **What**: the implemented behavior, endpoints, and important decisions.
- **How**: the technical approach and non-obvious design choices.
- **Modified files**: every created or changed file, with a one-line explanation.
- **Verification**: commands/tests run and their results.

## Security & Configuration Tips

Do not commit secrets. Start from `backend/.env.example` and keep local values in `backend/.env`. Backend development expects PostgreSQL, Redis, and values such as `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.
