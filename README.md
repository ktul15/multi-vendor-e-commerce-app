# Multi-Vendor E-Commerce App

A full-stack multi-vendor e-commerce platform built as a portfolio project. The existing Flutter customer storefront shares a Node.js REST API with vendor and admin dashboards that are being migrated from Flutter to Next.js.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Node.js REST API                     │
│        Express 5 · TypeScript · Prisma · PostgreSQL     │
│              Redis · Stripe · Firebase · Zod            │
└────────────┬──────────────┬──────────────┬──────────────┘
             │              │              │
    ┌────────▼──┐  ┌────────▼──┐  ┌───────▼───────┐
    │Storefront │  │  Vendor   │  │  Admin Panel  │
    │ (Flutter) │  │ Dashboard │  │   (Flutter)   │
    │           │  │ (Flutter) │  │               │
    └───────────┘  └───────────┘  └───────────────┘
```

| Directory                | Description                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| `backend/`               | Node.js + Express 5 REST API                                                  |
| `storefront/`            | Flutter customer-facing shopping app                                          |
| `vendor_dashboard/`      | Flutter app for vendors to manage products, orders, and earnings              |
| `admin_panel/`           | Flutter app for platform admins                                               |
| `apps/vendor-dashboard/` | Next.js vendor dashboard migration target                                     |
| `apps/admin-panel/`      | Next.js admin panel migration target                                          |
| `packages/`              | Shared web UI, API, schema, configuration, authentication, and test utilities |

---

## Backend

### Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express 5
- **ORM**: Prisma with PostgreSQL (`@prisma/adapter-pg`)
- **Cache / Token blacklist**: Redis (IORedis)
- **Auth**: JWT (access token 15 min, refresh token 7 days)
- **Payments**: Stripe (checkout + webhook)
- **Push notifications**: Firebase Admin SDK
- **File uploads**: Cloudinary + Multer
- **Email**: Nodemailer
- **Validation**: Zod v4
- **Rate limiting**: `express-rate-limit` + `rate-limit-redis`
- **API docs**: Swagger / OpenAPI at `/api/docs`
- **Containerisation**: Docker + Docker Compose

### API Modules

| Prefix                   | Module                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `/api/v1/auth`           | Registration, login, logout, token refresh, password reset    |
| `/api/v1/products`       | Product CRUD, variants, search, filtering, pagination         |
| `/api/v1/categories`     | Category tree management                                      |
| `/api/v1/cart`           | Cart management (add, update, remove, apply promo)            |
| `/api/v1/orders`         | Order placement, status tracking, order history               |
| `/api/v1/payments`       | Stripe checkout session + webhook handler                     |
| `/api/v1/addresses`      | Saved shipping address management                             |
| `/api/v1/reviews`        | Product reviews and ratings                                   |
| `/api/v1/wishlist`       | Wishlist add/remove/list                                      |
| `/api/v1/promo-codes`    | Promo code creation and validation                            |
| `/api/v1/notifications`  | In-app notification centre                                    |
| `/api/v1/banners`        | Homepage banner management                                    |
| `/api/v1/vendor-profile` | Vendor store profile (name, logo, bio)                        |
| `/api/v1/vendor-payouts` | Vendor earnings tracking and payout requests                  |
| `/api/v1/analytics`      | Vendor and platform-level sales analytics                     |
| `/api/v1/admin`          | Admin: user management, product moderation, platform settings |

### Module Structure

Each feature follows a strict four-file pattern:

```
src/modules/<name>/
├── <name>.routes.ts       # Express router + middleware chain
├── <name>.controller.ts   # Extract request data, call service, send response
├── <name>.service.ts      # Business logic + Prisma queries
└── <name>.validation.ts   # Zod schemas + inferred TypeScript types
```

### Role System

Three roles: `CUSTOMER`, `VENDOR`, `ADMIN`. RBAC is enforced via the `authorize(...roles)` middleware after JWT verification. Vendors can only modify their own resources (enforced in the service layer).

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
```

Optional: `STRIPE_SECRET_KEY`, `CLOUDINARY_*`, `SMTP_*`, `FIREBASE_*`

---

## Storefront (Flutter)

The customer-facing shopping app.

### Features

- Product browsing with category filters, search, and sort
- Product detail with image gallery, variants, and reviews
- Cart management with promo code support
- Stripe-powered checkout flow
- Order history and real-time order tracking
- Wishlist
- Saved addresses
- Push notifications (Firebase Messaging)
- Dark mode
- Deep linking (`storefrontapp://product/:id`, `storefrontapp://orders/:id`)
- Native splash screen and custom app icon

### Tech Stack

- **State management**: flutter_bloc (BLoC + Cubit)
- **Routing**: GoRouter v17 with auth-aware redirects
- **HTTP**: Dio
- **DI**: GetIt
- **Storage**: flutter_secure_storage, shared_preferences
- **Payments**: flutter_stripe
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

Same VGV four-layer architecture and tech stack as the storefront.

---

## Admin Panel (Flutter)

Platform administration interface.

### Features

- Platform-wide sales dashboard and analytics
- User management (view, suspend)
- Vendor management and approval
- Product moderation
- Category and banner management
- Promo code management
- Finance overview

---

## Web Workspace (Next.js)

The vendor dashboard and admin panel web applications share a pnpm and Turborepo workspace. Use Node.js 24.15.0 (the pinned LTS runtime) and pnpm 11.18.0 from the repository root.

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
```

Copy each application's `.env.example` to `.env.local` before development. Turborepo caches generated build outputs and hashes build-time environment variables; dependency downloads are cached separately by pnpm in CI. The generated API types in `packages/api-client` and their source `backend/openapi.json` are committed so CI can detect contract drift; other generated dependencies and build outputs are not committed.

---

## CI / CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow     | Trigger               | Steps                                                                                                           |
| ------------ | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ci.yml`     | PR to `dev` or `main` | Independent backend and web quality-gate jobs; web checks formatting, lint, types, tests, and production builds |
| `deploy.yml` | Push to `main`        | Build and push the backend Docker image to GHCR                                                                 |

---

## Git Flow

```
feature/* ──► dev ──► main
```

- Feature branches are cut from `dev` and named `feature/<issue-number>-<short-description>`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- `main` is only updated by merging `dev` — never committed to directly

---

## Database Schema (key models)

`User` · `Product` · `Variant` · `Category` · `Cart` · `CartItem` · `Order` · `OrderItem` · `Payment` · `Address` · `Review` · `WishlistItem` · `PromoCode` · `PromoUsage` · `VendorProfile` · `VendorEarning` · `VendorPayout` · `Notification` · `Banner` · `PlatformSetting`
