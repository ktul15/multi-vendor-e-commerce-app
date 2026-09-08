# Multi-Vendor E-Commerce App

A full-stack multi-vendor e-commerce platform built as a portfolio project. A Flutter customer storefront and three Flutter/Next.js management dashboards share a single Node.js REST API backed by PostgreSQL, Redis, and Stripe.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Node.js REST API                         │
│         Express 5 · TypeScript · Prisma · PostgreSQL         │
│               Redis · Stripe · Firebase · Zod                │
└──────┬──────────┬───────────────┬───────────────┬────────────┘
       │          │               │               │
  ┌────▼───┐  ┌───▼────────┐  ┌───▼────────┐  ┌───▼────────┐
  │Store-  │  │  Vendor    │  │  Vendor    │  │   Admin    │
  │front   │  │ Dashboard  │  │ Dashboard  │  │   Panel    │
  │(Flutter)│  │ (Flutter)  │  │ (Next.js)  │  │ (Next.js)  │
  └────────┘  └────────────┘  └────────────┘  └────────────┘
```

| Directory                | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `backend/`               | Node.js + Express 5 REST API                                      |
| `storefront/`            | Flutter customer-facing shopping app                              |
| `vendor_dashboard/`      | Flutter vendor management app                                     |
| `admin_panel/`           | Flutter platform administration app                               |
| `apps/vendor-dashboard/` | Next.js vendor dashboard (web)                                    |
| `apps/admin-panel/`      | Next.js admin panel (web)                                         |
| `packages/`              | Shared web packages (UI, auth, API client, schemas, config, etc.) |
| `e2e/`                   | Playwright end-to-end tests for the web dashboards                |
| `tooling/`               | Build-time tooling (OpenAPI codegen, source-map checks, budgets)  |
| `scripts/`               | CI/CD and GitHub Project automation scripts                       |
| `docs/`                  | Operations runbooks, migration guides, and payment documentation  |

---

## Backend

### Tech Stack

- **Runtime**: Node.js 24 LTS + TypeScript
- **Framework**: Express 5
- **ORM**: Prisma 7 with PostgreSQL (`@prisma/adapter-pg`)
- **Cache / Token blacklist / Rate limiting store**: Redis (ioredis)
- **Auth**: JWT (access token 15 min, refresh token 7 days) — Bearer tokens for Flutter, HttpOnly cookies + CSRF for web dashboards
- **Payments**: Stripe (Checkout + Connect for vendor payouts), Razorpay (Route sandbox with deterministic mock)
- **Push notifications**: Firebase Admin SDK (FCM)
- **File uploads**: Cloudinary + Multer
- **Email**: Nodemailer
- **Validation**: Zod v4
- **Rate limiting**: `express-rate-limit` + `rate-limit-redis`
- **API docs**: Swagger / OpenAPI at `/api/docs` (dev only)
- **Containerisation**: Docker + Docker Compose

### API Modules

| Prefix                   | Module                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `/api/health`            | Liveness probe and dependency readiness (PostgreSQL + Redis)                               |
| `/api/v1/auth`           | Registration, login, logout, token refresh, password reset                                 |
| `/api/v1/products`       | Product CRUD, variants, media, search, filtering, pagination                               |
| `/api/v1/categories`     | Category tree management                                                                   |
| `/api/v1/cart`           | Cart management (add, update, remove, apply promo)                                         |
| `/api/v1/orders`         | Order placement, status tracking, order history, vendor sub-orders                         |
| `/api/v1/payments`       | Stripe/Razorpay checkout session creation + webhook handlers                               |
| `/api/v1/addresses`      | Saved shipping address management                                                          |
| `/api/v1/reviews`        | Product reviews and ratings                                                                |
| `/api/v1/wishlist`       | Wishlist add/remove/list                                                                   |
| `/api/v1/promo-codes`    | Promo code creation and validation                                                         |
| `/api/v1/notifications`  | In-app notification centre                                                                 |
| `/api/v1/banners`        | Homepage banner management                                                                 |
| `/api/v1/vendor-profile` | Vendor store profile (name, logo, banner, bio, payment onboarding)                         |
| `/api/v1/vendor-payouts` | Vendor earnings tracking, payout requests, and Connect webhook handler                     |
| `/api/v1/analytics`      | Vendor and platform-level sales analytics                                                  |
| `/api/v1/admin`          | User management, vendor lifecycle, product moderation, commission, orders, revenue reports |

### Module Structure

Each feature follows a strict four-file pattern:

```
src/modules/<name>/
├── <name>.routes.ts       # Express router + middleware chain
├── <name>.controller.ts   # Extract request data, call service, send response
├── <name>.service.ts      # Business logic + Prisma queries
└── <name>.validation.ts   # Zod schemas + inferred TypeScript types
```

### Security

- **Helmet** — strict Content-Security-Policy on all routes (relaxed only for Swagger UI)
- **CORS** — explicit origin allowlist; production requires HTTPS
- **CSRF** — double-submit cookie pattern with timing-safe comparison for cookie-based (web) sessions; Bearer-token clients (Flutter) bypass CSRF
- **Fetch Metadata** — rejects cross-site mutations lacking a validated `Origin`
- **Rate limiting** — global, auth-specific, and dashboard-scoped limiters; Redis store in production for distributed enforcement
- **Idempotency** — PostgreSQL-backed mutation replay coordination via `Idempotency-Key` header with lease, conflict, and reconciliation semantics
- **Credential validation** — live Stripe/Razorpay keys are rejected; JWT secrets must differ and meet minimum length in production

### Role System

Three roles: `CUSTOMER`, `VENDOR`, `ADMIN`. RBAC is enforced via the `authorize(...roles)` middleware after JWT verification. Vendors can only modify their own resources (enforced in the service layer). Vendor operations additionally require an `APPROVED` vendor profile status via `requireApprovedVendor` middleware.

### Running the Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, JWT secrets, etc.

# Database
npm run db:migrate     # run migrations

# Deterministic dashboard E2E data (deletes all rows in a dedicated test DB)
WEB_E2E_RESET_CONFIRMATION=DELETE_E2E_DATA npm run db:e2e:seed
WEB_E2E_RESET_CONFIRMATION=DELETE_E2E_DATA npm run db:e2e:cleanup

# Development
npm run dev            # hot reload with ts-node-dev

# Tests
npm test               # all tests (requires TEST_DATABASE_URL)
npm run test:coverage  # with coverage report

# Docker
docker-compose up      # spins up api + postgres + redis
```

Production containers never apply schema changes during startup. Use the protected, audited [database migration rollout](docs/operations/database-migration-rollout.md) for staging and production changes.

See [the web E2E data workflow](docs/migrations/web-e2e-data-workflow.md) for database-name safeguards, fixtures, and CI usage.

#### Required environment variables

```
DATABASE_URL=
TEST_DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
DASHBOARD_BFF_SECRET=
```

Optional: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, Stripe Connect URLs, `RAZORPAY_*`, `PLATFORM_COMMISSION_RATE`, `CLOUDINARY_*`, `SMTP_*`, `GOOGLE_APPLICATION_CREDENTIALS`, and `STOREFRONT_URL` / `VENDOR_DASHBOARD_URL` / `ADMIN_DASHBOARD_URL` for CORS. See [`.env.example`](backend/.env.example) for a full list. Live payment keys are rejected.

---

## Storefront (Flutter)

The customer-facing shopping app.

### Features

- Product browsing with category filters, search, and sort
- Product detail with image gallery, variants, and reviews
- Cart management with promo code support
- Hybrid Stripe and Razorpay sandbox checkout flow
- Order history and real-time order tracking
- Wishlist
- Saved addresses
- Push notifications (Firebase Messaging)
- Dark mode
- Deep linking (`storefrontapp://product/:id`, `storefrontapp://orders/:id`)
- Native splash screen and custom app icon

### Tech Stack

- **State management**: flutter_bloc (BLoC + Cubit)
- **Routing**: GoRouter with auth-aware redirects
- **HTTP**: Dio
- **DI**: GetIt
- **Storage**: flutter_secure_storage, shared_preferences
- **Payments**: flutter_stripe, razorpay_flutter (test mode only)
- **Push notifications**: firebase_messaging
- **Charts**: fl_chart

### Architecture

Follows the [Very Good Ventures four-layer architecture](https://www.verygood.ventures/blog/very-good-flutter-architecture):

```
storefront/lib/
├── core/               # Theme, routing, network (Dio), DI (GetIt)
├── repositories/       # All data-access implementations
├── features/
│   └── <feature>/
│       ├── bloc/       # BLoC or Cubit + State (+ Event for BLoC)
│       ├── view/       # *_page.dart screens
│       └── widgets/    # Feature-scoped UI components
└── shared/
    ├── models/         # Models used across features
    └── widgets/        # Shared UI (SkeletonBox, EmptyState, ErrorState)
```

### Running the Storefront

```bash
cd storefront
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1

# Static analysis (must pass before commit)
flutter analyze --no-fatal-infos

# Tests
flutter test
```

Payment provider routing is trusted server-side configuration. Indian vendors use Razorpay Route sandbox; supported non-Indian vendors retain Stripe test mode, and mixed-provider carts are rejected. See the [hybrid sandbox architecture](docs/payments/hybrid-sandbox-architecture.md) for setup, limitations, refunds, webhooks, and the deterministic Route mock.

---

## Vendor Dashboard (Flutter)

Allows vendors to manage their store on the platform.

### Features

- Vendor application/signup with admin approval
- Pending/rejected/suspended vendor status handling
- Dashboard with sales summary and revenue charts
- Product management (create, edit, delete, variants)
- Order management and fulfilment
- Earnings tracking and payout requests
- Store profile management

### Architecture

Same VGV four-layer architecture and tech stack as the storefront (minus payment/notification packages).

---

## Admin Panel (Flutter)

Platform administration interface.

### Features

- Platform-wide sales dashboard and analytics
- User management (view, ban/unban)
- Vendor management and approval lifecycle (approve, reject, suspend)
- Product moderation (activate, deactivate, delete)
- Category and banner management (with image uploads)
- Promo code management
- Commission rate configuration (platform default and per-vendor overrides)
- Order browsing and detail view
- Finance overview (revenue reports, earnings, payouts)

---

## Web Workspace (Next.js)

The vendor dashboard and admin panel web applications share a pnpm + Turborepo monorepo workspace. Use Node.js 24.15.0 (the pinned LTS runtime, see `.nvmrc`) and pnpm 11.18.0 from the repository root.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + shared `@repo/ui` design system
- **Data fetching**: TanStack React Query
- **Tables**: TanStack React Table
- **Forms**: React Hook Form + `@hookform/resolvers`
- **Validation**: Zod
- **API client**: Auto-generated OpenAPI types (`@repo/api-client` from `backend/openapi.json`)
- **Auth**: Cookie-based BFF proxy with HMAC-signed rate-limit identity (`@repo/auth`)
- **Observability**: `@repo/observability` (deployment metadata)
- **Testing**: Vitest + React Testing Library + MSW (API mocking)
- **E2E testing**: Playwright + axe-core (accessibility)

### Shared Packages

| Package               | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `@repo/api-client`    | Generated OpenAPI TypeScript types                          |
| `@repo/auth`          | Cookie-based auth helpers, BFF proxy, CSRF token management |
| `@repo/config`        | Shared environment and build configuration                  |
| `@repo/observability` | Deployment metadata and instrumentation                     |
| `@repo/query`         | Shared TanStack Query configuration and hooks               |
| `@repo/schemas`       | Shared Zod validation schemas                               |
| `@repo/test-utils`    | Test helpers, MSW handlers, and fixtures                    |
| `@repo/ui`            | Shared React UI components and design system                |

### Running the Web Workspace

```bash
# Install the exact lockfile dependency graph
pnpm install --frozen-lockfile

# Run both applications (vendor: 3001, admin: 3002)
pnpm run dev

# Required web quality checks
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build

# Apply formatting locally
pnpm run format

# Regenerate or verify the shared OpenAPI client contract
pnpm run api:generate
pnpm run api:check

# End-to-end tests (requires backend services running)
pnpm run test:e2e
```

Copy each application's `.env.example` to `.env.local` before development. Turborepo caches generated build outputs and hashes build-time environment variables; dependency downloads are cached separately by pnpm in CI. The generated API types in `packages/api-client` and their source `backend/openapi.json` are committed so CI can detect contract drift; other generated dependencies and build outputs are not committed.

---

## CI / CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow               | Trigger                                 | Steps                                                                                                                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`               | PR to `dev` or `main`                   | Independent backend and web quality-gate jobs; backend runs lint, OpenAPI snapshot check, tests (with Postgres + Redis services), and build; web runs formatting, API type checks, lint, typecheck, critical regressions, unit tests, production build, source-map verification, Playwright E2E, and E2E cleanup |
| `deploy.yml`           | Push to `main`                          | Build and push the backend Docker image to GHCR                                                                                                                                                                                                                                                                  |
| `database-migrate.yml` | Manual dispatch (staging or production) | Audited, environment-protected database migration with immutable release SHA, backup verification, evidence artifacts, and contract-phase gating                                                                                                                                                                 |
| `deployment-smoke.yml` | Manual dispatch (staging or production) | Verify deployed dashboard health, backend database/cache readiness, and exact credentialed CORS                                                                                                                                                                                                                  |

The Next.js dashboards deploy to Vercel and the Express/PostgreSQL/Redis stack deploys to Railway. See the [deployment runbook](docs/operations/vercel-railway-deployment.md) for environment configuration, health monitoring, rollback, and incident handling.

---

## Git Flow

```
feature/* ──► dev ──► main
```

- Feature branches are cut from `dev` and named `feature/<issue-number>-<short-description>`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- `main` is only updated by merging `dev` — never committed to directly

---

## Database Schema

### Key Models

`User` · `VendorProfile` · `Product` · `ProductMedia` · `Variant` · `Category` · `Cart` · `CartItem` · `Order` · `VendorOrder` · `OrderItem` · `Payment` · `PaymentRefund` · `PaymentWebhookEvent` · `Address` · `Review` · `WishlistItem` · `PromoCode` · `PromoUsage` · `Notification` · `Banner` · `VendorEarning` · `VendorPayout` · `PlatformSetting` · `IdempotencyRecord`

### Key Enums

`Role` · `OrderStatus` · `PaymentStatus` · `PaymentMethod` · `PaymentProvider` · `RefundStatus` · `RefundReversalStatus` · `DiscountType` · `VendorProfileStatus` · `VendorOnboardingStatus` · `EarningStatus` · `PayoutStatus` · `Currency` · `NotificationType`

---

## License

[MIT](LICENSE)
