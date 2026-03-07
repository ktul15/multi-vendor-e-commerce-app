# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flutter storefront with product listings, cart, payments (Stripe), and order tracking. Node.js backend with REST APIs, JWT auth, and a vendor dashboard.

Currently only the **backend** is implemented. The `backend/` directory is the active workspace.

## Git Flow

Branch hierarchy: `feature/*` → `dev` → `main`

**Rules (must follow for every issue):**
1. Always cut new feature branches from `dev`, never from `main`
2. Branch naming: `feature/<issue-number>-<short-description>` (e.g., `feature/21-product-filters`)
3. Commit messages follow Conventional Commits: `feat(scope): description`, `fix(scope): description`, etc.
4. Merge feature branch into `dev` when the feature is complete and tests pass
5. `main` is only updated by merging `dev` — never commit directly to `main` or `dev`

**Starting a new feature:**
```bash
git checkout dev
git pull origin dev
git checkout -b feature/<issue-number>-<short-description>
```

**Finishing a feature:**
```bash
git checkout dev
git merge --no-ff feature/<issue-number>-<short-description>
git push origin dev
```

**Before committing — mandatory code review:**
1. Run the `senior-code-reviewer` agent on all changed files
2. List every issue/suggestion found (short description of each)
3. Ask the user which fixes to implement before proceeding with the commit

## Commands

All commands run from the `backend/` directory.

```bash
# Development
npm run dev           # Start dev server with hot reload (ts-node-dev)
npm run build         # Compile TypeScript to dist/
npm run start         # Run compiled output

# Code quality
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier write
npm run format:check  # Prettier check

# Testing
npm test                          # Run all tests
npm run test:watch                # Watch mode
npm run test:coverage             # With coverage report
npx jest --testPathPattern=auth   # Run a single test file by pattern

# Database
npm run db:migrate    # Prisma migrate dev (creates migration + applies)
npm run db:push       # Push schema without migration file
npm run db:seed       # Run prisma/seed.ts
npm run db:studio     # Open Prisma Studio
npm run prisma:generate  # Regenerate Prisma client after schema change
```

## Architecture

### Module Structure

Each feature lives in `src/modules/<name>/` and follows a strict four-file pattern:

| File | Responsibility |
|------|---------------|
| `*.routes.ts` | Express router, middleware chain |
| `*.controller.ts` | Extract request data, call service, send response |
| `*.service.ts` | Business logic + Prisma queries |
| `*.validation.ts` | Zod schemas + inferred TypeScript types |

Current modules: `auth`, `category`, `product`.

### Shared Infrastructure (`src/`)

- **`config/env.ts`** — Single source of truth for all env vars; import `env` from here, never `process.env` directly.
- **`config/prisma.ts`** — Singleton Prisma client (PostgreSQL + `@prisma/adapter-pg`).
- **`config/redis.ts`** — IORedis client for token blacklisting and rate limit storage.
- **`middleware/auth.ts`** — `authenticate` (JWT verification) and `authorize(...roles)` (RBAC). After `authenticate`, `req.user` contains `{ userId, email, role }` via the `AuthRequest` type.
- **`middleware/validate.ts`** — `validate(schema)` for `req.body` and `validateQuery(schema)` for `req.query`. Both replace the request property with Zod-parsed/coerced data.
- **`middleware/errorHandler.ts`** — Central error handler; converts `ApiError` instances to structured JSON responses.
- **`utils/apiError.ts`** — `ApiError` class with static factory methods (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooManyRequests`, `internal`). Throw these from services.
- **`utils/apiResponse.ts`** — `ApiResponse` class with `success`, `created`, `noContent`, `error` static methods. Use in controllers.
- **`utils/catchAsync.ts`** — Wraps async controller functions to forward errors to Express error handler.

### Request/Response Contract

All API responses follow this shape:
```json
{ "success": true|false, "message": "...", "data": {...} }
```
Validation errors include an `errors` array: `[{ "field": "email", "message": "..." }]`.

### Authentication Flow

- JWT access token (15m) + refresh token (7d).
- Logout blacklists the refresh token in Redis with TTL = remaining expiry.
- `isTokenBlacklisted()` is checked on refresh to prevent reuse.

### Prisma Client

Generated into `src/generated/prisma/` (not the default `node_modules` location). After any schema change, run `npm run prisma:generate`. Import from `../../generated/prisma/client` for model types and from `../../config/prisma` for the `prisma` singleton.

### Role System

Three roles defined in the Prisma schema: `CUSTOMER`, `VENDOR`, `ADMIN`. Product write routes are `VENDOR`-only; public read routes require no auth. Vendors can only modify their own products (enforced in service layer by comparing `product.vendorId` to `req.user.userId`).

## Testing

Tests live in two locations:
- `src/__tests__/` — Auth integration tests (uses the app directly with supertest)
- `__tests__/integration/` — Category and product integration tests

Tests run against the real database (uses `TEST_DATABASE_URL` env var). The setup helper (`src/__tests__/setup.ts`) provides `setupTestDB`, `teardownTestDB`, and `cleanDatabase` utilities. Each test suite calls `cleanDatabase()` in `beforeEach` to ensure isolation.

Jest path aliases (`@config/`, `@middleware/`, `@modules/`, `@utils/`) are configured in `jest.config.js` and mirror the `tsconfig` path aliases.

## Environment Variables

Required in `backend/.env`:
```
DATABASE_URL=
TEST_DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

Optional (for future features): `STRIPE_SECRET_KEY`, `CLOUDINARY_*`, `SMTP_*`, `STOREFRONT_URL`, `VENDOR_DASHBOARD_URL`, `ADMIN_DASHBOARD_URL`.
