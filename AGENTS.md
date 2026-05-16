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

## Security & Configuration Tips

Do not commit secrets. Start from `backend/.env.example` and keep local values in `backend/.env`. Backend development expects PostgreSQL, Redis, and values such as `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.
