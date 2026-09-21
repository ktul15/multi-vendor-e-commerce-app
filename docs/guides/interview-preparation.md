# Multi-Vendor E-Commerce App — Interview Preparation Guide

> A complete deep-dive into every architectural decision, design pattern, and implementation detail you need to confidently explain this project in any technical interview.

---

## Table of Contents

1. [The 30-Second Elevator Pitch](#1-the-30-second-elevator-pitch)
2. [System Architecture — The Big Picture](#2-system-architecture--the-big-picture)
3. [Backend Deep Dive](#3-backend-deep-dive)
4. [Database Design & Prisma](#4-database-design--prisma)
5. [Authentication & Security](#5-authentication--security)
6. [Payment System — The Showpiece](#6-payment-system--the-showpiece)
7. [Flutter Applications](#7-flutter-applications)
8. [Web Workspace (Next.js Monorepo)](#8-web-workspace-nextjs-monorepo)
9. [Testing Strategy](#9-testing-strategy)
10. [DevOps, CI/CD & Deployment](#10-devops-cicd--deployment)
11. [Key Design Patterns & Architectural Decisions](#11-key-design-patterns--architectural-decisions)
12. [Likely Interview Questions & Answers](#12-likely-interview-questions--answers)
13. [Terminology Cheat Sheet](#13-terminology-cheat-sheet)

---

## 1. The 30-Second Elevator Pitch

> "I built a **full-stack, production-grade multi-vendor e-commerce marketplace** — like a mini Shopify meets Amazon Marketplace. It has a **Node.js/TypeScript REST API** with PostgreSQL, Redis, and dual-provider payment processing (Stripe + Razorpay), a **Flutter mobile storefront**, legacy **Flutter dashboard apps**, and current **Next.js dashboards** sharing a Turborepo monorepo with auto-generated OpenAPI types. I implemented things like **idempotent mutation replay**, **atomic token rotation with Redis Lua scripts**, **CSRF double-submit cookies with timing-safe comparison**, **largest-remainder payment allocation**, and a full **CI/CD pipeline** with GitHub Actions, Docker, and Playwright E2E tests."

---

## 2. System Architecture — The Big Picture

```
┌────────────────────────────────────────────────────────────────┐
│                     Node.js REST API                           │
│         Express 5 · TypeScript · Prisma 7 · PostgreSQL         │
│               Redis · Stripe · Razorpay · Firebase · Zod       │
└──────┬──────────┬───────────────┬───────────────┬──────────────┘
       │          │               │               │
  ┌────▼───┐  ┌───▼────────┐  ┌───▼────────┐  ┌───▼────────┐
  │Store-  │  │  Vendor    │  │  Vendor    │  │   Admin    │
  │front   │  │ Dashboard  │  │ Dashboard  │  │   Panel    │
  │(Flutter)│  │ (Flutter)  │  │ (Next.js)  │  │ (Next.js)  │
  └────────┘  └────────────┘  └────────────┘  └────────────┘
```

### Why This Architecture?

| Decision                                | Rationale — what to say in interview                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single REST API serving all clients** | Avoids code duplication; all business logic is centralized. One source of truth for validation, auth, and data.                                      |
| **Flutter applications**                | Demonstrates cross-platform competency. BLoC pattern is industry-standard for scalable Flutter state management.                                     |
| **Next.js for web dashboards**          | Shows React/TypeScript expertise. Server-side rendering + App Router shows awareness of modern web patterns.                                         |
| **Monorepo (pnpm + Turborepo)**         | Shared packages (`@repo/ui`, `@repo/auth`, `@repo/schemas`) eliminate code duplication. Turborepo caches builds for speed.                           |
| **PostgreSQL over MongoDB**             | E-commerce data is inherently relational (users → orders → items → products → vendors). Joins, transactions, and referential integrity are critical. |
| **Redis**                               | Used for token blacklisting, rate-limit coordination across instances, and caching. Sub-millisecond lookups.                                         |

### Key Numbers to Remember

| Metric              | Value                             |
| ------------------- | --------------------------------- |
| Backend API modules | 17 modules                        |
| Database models     | 25 models                         |
| Database enums      | 14 enums                          |
| API route groups    | 16 prefixes                       |
| Flutter apps        | 3 (storefront, vendor, admin)     |
| Next.js apps        | 2 (vendor dashboard, admin panel) |
| Shared web packages | 8 (`@repo/*`)                     |
| Unit tests          | 17 test files                     |
| Integration tests   | 14 test files                     |
| E2E test specs      | 7 Playwright specs                |
| CI workflows        | 4 GitHub Actions                  |

---

## 3. Backend Deep Dive

### 3.1 Tech Stack

| Technology      | Version | Purpose                                           |
| --------------- | ------- | ------------------------------------------------- |
| Node.js         | 24 LTS  | Runtime                                           |
| Express         | 5       | HTTP framework (async error handling baked in)    |
| TypeScript      | 5.9     | Type safety                                       |
| Prisma          | 7       | Type-safe ORM with `@prisma/adapter-pg`           |
| PostgreSQL      | 16      | Primary database                                  |
| Redis (ioredis) | —       | Token blacklist, rate limiting, caching           |
| Zod             | v4      | Request validation with TypeScript type inference |
| Stripe          | —       | Payments + Connect (vendor payouts)               |
| Razorpay        | —       | Alternative payment provider (India)              |
| Firebase Admin  | —       | FCM push notifications                            |
| Cloudinary      | —       | Image uploads and CDN                             |
| Nodemailer      | —       | Transactional emails                              |
| Docker          | —       | Containerization                                  |

### 3.2 Module Pattern — "Four-File Convention"

Most feature modules follow this convention. Small modules such as `health` may
contain only routes, `auth` names its validation file `auth.schema.ts`, and
complex domains may add specialized files. This is useful to articulate in
interviews because it shows you value **separation of concerns** without forcing
every feature into an identical shape:

```
src/modules/<feature>/
├── <feature>.routes.ts       # Express router + middleware chain
├── <feature>.controller.ts   # Extracts request data, calls service, sends response
├── <feature>.service.ts      # Business logic + Prisma queries
└── <feature>.validation.ts   # Zod schemas + inferred TypeScript types
```

**Why this pattern?**

- **Routes**: Declarative middleware stacking (auth → validate → rate-limit → controller)
- **Controller**: Thin — just orchestrates. No business logic here.
- **Service**: All business logic. Testable in isolation without HTTP concerns.
- **Validation**: Zod schemas auto-infer TypeScript types (`z.infer<typeof schema>`). Single source of truth for both runtime validation and compile-time types.

### 3.3 All 17 Modules

| Module           | Key Complexity                                                                       |
| ---------------- | ------------------------------------------------------------------------------------ |
| `auth`           | JWT rotation with Redis Lua atomicity, dual-mode (cookie + bearer)                   |
| `product`        | Full CRUD with variants, media positions, Cloudinary uploads                         |
| `category`       | Self-referencing tree (parent/child categories)                                      |
| `cart`           | Variant-level cart items, promo code application                                     |
| `order`          | Multi-vendor order splitting, stock decrement in transaction, atomic promo usage     |
| `payment`        | Dual-provider gateway abstraction (Stripe/Razorpay), webhook handlers, refunds       |
| `vendor-profile` | Approval workflow (PENDING → APPROVED/REJECTED/SUSPENDED), Stripe Connect onboarding |
| `vendor-payout`  | Earnings tracking, transfer webhooks, payout lifecycle                               |
| `analytics`      | Vendor and platform-level sales aggregation                                          |
| `admin`          | User management, vendor lifecycle, product moderation, commission configuration      |
| `review`         | Rating with denormalized `avgRating`/`reviewCount` on Product (atomically updated)   |
| `wishlist`       | Simple but has unique constraint `@@unique([userId, productId])`                     |
| `notification`   | In-app + FCM push, fire-and-forget pattern                                           |
| `promo`          | Usage limits with raw SQL atomic check-and-increment to prevent race conditions      |
| `banner`         | Positioned banners with Cloudinary image management                                  |
| `address`        | Default address enforcement via transaction                                          |
| `health`         | Liveness + readiness probes (checks PostgreSQL + Redis)                              |

### 3.4 Middleware Stack

The middleware chain order in [app.ts](../../backend/src/app.ts) is significant:

```
1. Helmet (security headers)
2. CORS (origin allowlist)
3. Body parsing (with raw body capture for webhook verification)
4. CSRF protection (double-submit cookie)
5. Health check routes (before rate limiting!)
6. Webhook routes (before rate limiting — Stripe retries must not be throttled)
7. Rate limiters (global → dashboard-client → dashboard-aggregate)
8. Logging (Morgan)
9. API routes
10. 404 handler
11. Global error handler
```

**Interview tip**: Emphasize that webhook routes are mounted _before_ rate limiters. This is a real-world production consideration — Stripe will retry webhooks, and throttling them causes payment state inconsistencies.

### 3.5 Key Middleware Implementations

#### Rate Limiting ([rateLimiter.ts](../../backend/src/middleware/rateLimiter.ts))

Three request-wide tiers plus an auth-specific limiter:

1. **Global limiter** — 100 req/15min (prod) by IP or dashboard identity
2. **Dashboard client limiter** — 300 req/15min per BFF client hash
3. **Dashboard aggregate limiter** — 10,000 req/15min per dashboard source (admin/vendor)
4. **Auth limiter** — 10 req/15min (prevents brute force)

Dashboard BFF traffic uses **HMAC-signed identity headers** instead of IP. The signature includes `timestamp\nMETHOD\npath\nsource\nclient\nidentity`, verified with timing-safe comparison and a 30-second clock skew tolerance.

#### Idempotency ([idempotency.ts](../../backend/src/middleware/idempotency.ts))

> [!IMPORTANT]
> This is a **standout feature** for interviews. Very few portfolio projects implement idempotency.

The protected vendor-order status transition uses PostgreSQL-backed **mutation
replay coordination**:

1. Client sends `Idempotency-Key` header (16–200 URL-safe chars)
2. Middleware creates a claim with `createMany({ skipDuplicates: true })`
3. **New claim** → execute handler, capture response via monkey-patched `res.json()`, persist outcome
4. **Existing COMPLETED claim** → replay cached response (set `Idempotency-Replayed: true` header)
5. **Existing IN_PROGRESS claim** → return 409 with `Retry-After: 2`
6. **Expired lease** → mark as AMBIGUOUS, return 409 with reconciliation path
7. **Different request body with same key** → 409 CONFLICT

The request body is fingerprinted with SHA-256 over canonicalized JSON (sorted keys), so reordered JSON fields still match. 5xx responses are marked AMBIGUOUS (not replayed), forcing clients to reconcile.

#### CSRF Protection ([csrf.ts](../../backend/src/middleware/csrf.ts))

**Double-submit cookie pattern** with important nuances:

- Bearer token clients (Flutter) **bypass CSRF** — they aren't vulnerable to CSRF attacks
- Cookie-authenticated clients (Next.js dashboards) **require CSRF**
- Token comparison uses `crypto.timingSafeEqual()` — prevents timing attacks
- Fetch Metadata (`Sec-Fetch-Site`) rejects cross-site mutations without a validated Origin
- CSRF error returns a machine-identifiable header so the BFF can auto-retry token refresh

### 3.6 Server Startup & Graceful Shutdown

From [server.ts](../../backend/src/server.ts):

1. **Startup**: Probe PostgreSQL (`SELECT 1`), connect Redis, initialize Firebase, then listen
2. **Shutdown** (SIGTERM/SIGINT): Disconnect Redis → disconnect Prisma → end pg pool → exit
3. **Process guards**: `unhandledRejection` and `uncaughtException` both cause exit (fail fast)

### 3.7 Environment Safety ([env.ts](../../backend/src/config/env.ts))

Production-grade environment validation:

- **JWT secrets** must be ≥32 chars in production and must differ from each other
- **Stripe/Razorpay keys** must be test/sandbox credentials (live keys rejected!)
- **CORS origins** must be valid absolute URLs with HTTPS in production
- **Dashboard BFF secret** must be ≥32 chars in production
- **Stripe Connect redirect URLs** must resolve to the vendor dashboard origin

---

## 4. Database Design & Prisma

### 4.1 Schema Highlights

The [schema.prisma](../../backend/prisma/schema.prisma) has 25 models and 14 enums.

#### Multi-Vendor Order Splitting

The most complex relationship:

```
Customer places Order
  └── Order splits into VendorOrders (one per vendor)
       └── Each VendorOrder has OrderItems
            └── Each OrderItem references a Variant
```

**Why?** Each vendor fulfills their items independently. One vendor might ship while another is still processing. Each `VendorOrder` has its own status, tracking number, and carrier.

#### Key Design Decisions

| Decision                                                        | Why                                                                                                                                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shipping address snapshot in Order** (`shippingAddress Json`) | If user edits their address later, existing orders still show the correct shipping address. The `addressId` FK is kept for reference but the snapshot is authoritative.     |
| **Denormalized `avgRating`/`reviewCount` on Product**           | Avoids expensive aggregation queries on every product listing. Updated atomically alongside Review writes.                                                                  |
| **`PromoCode.usageCount` atomic increment**                     | Raw SQL `UPDATE WHERE usageCount < usageLimit` prevents race conditions. No TOCTOU bugs.                                                                                    |
| **`PromoUsage` tracking table**                                 | Enables per-user limit enforcement with atomic `INSERT ... WHERE (SELECT COUNT)`                                                                                            |
| **`VendorEarning` per VendorOrder**                             | Precise commission tracking per vendor per order. Upserted as `PENDING` during checkout before the provider call, then transitioned as transfers succeed, fail, or reverse. |
| **`PaymentWebhookEvent` deduplication**                         | `@@unique([provider, eventId])` ensures webhook replay is idempotent                                                                                                        |
| **`IdempotencyRecord` scoped replay**                           | `@@unique([scope, key])` — scope includes user role + ID, so different users can use the same key                                                                           |
| **`CartItem` unique by `[cartId, variantId]`**                  | Prevents duplicate items; "add to cart" increments quantity instead                                                                                                         |
| **`Review` unique by `[userId, productId]`**                    | One review per user per product                                                                                                                                             |
| **`onDelete: Restrict` on Order → Address**                     | Prevents deleting an address that's used in an order                                                                                                                        |
| **`onDelete: Restrict` on OrderItem → Variant**                 | Prevents deleting a variant that has been ordered                                                                                                                           |
| **`PlatformSetting` key-value store**                           | Admin-configurable settings (e.g., `defaultCommissionRate`) without schema changes                                                                                          |

#### Index Strategy

```prisma
@@index([categoryId])       // Product filter by category
@@index([vendorId])          // Products by vendor
@@index([name])              // Product search
@@index([avgRating])         // Sort by rating
@@index([userId, isRead])    // Unread notification count
@@index([userId, createdAt]) // Notification chronological listing
@@index([status])            // Order/payment/earning queries by status
@@index([createdAt])         // Chronological queries
```

### 4.2 Prisma-Specific Knowledge

- **Prisma 7** with `@prisma/adapter-pg` — uses raw `pg.Pool` for connection management
- **Prisma `$transaction()`** — Interactive transactions for order creation (stock + promo + order in one atomic unit)
- **`createMany({ skipDuplicates: true })`** — Used in idempotency to atomically claim a key
- **`$executeRaw` with tagged template literals** — Used for atomic promo usage increment (SQL injection safe)
- **Prisma Client generated in `src/generated/prisma/`** — gitignored, generated during build

---

## 5. Authentication & Security

### 5.1 JWT Authentication Flow

**Dual-mode authentication** — this is architecturally interesting:

| Client             | Token Delivery                  | CSRF Required?              |
| ------------------ | ------------------------------- | --------------------------- |
| Flutter (mobile)   | `Authorization: Bearer <token>` | No — not vulnerable to CSRF |
| Next.js dashboards | `HttpOnly` cookies              | Yes — double-submit cookie  |

**Token lifecycle:**

1. **Access token**: 15-minute expiry, contains `{ userId, email, role }`
2. **Refresh token**: 7-day expiry, used to obtain new access tokens
3. **Refresh rotation**: Old token consumed, new token issued atomically

### 5.2 Token Blacklist with Redis Lua Scripts

> [!IMPORTANT]
> This is an advanced topic — interviewers love hearing about it.

From [tokenBlacklist.ts](../../backend/src/utils/tokenBlacklist.ts):

**Why Redis Lua scripts?** Atomicity. Multiple Redis operations must happen as one unit:

#### Rotation Script (`ROTATE_REFRESH_SCRIPT`):

1. Check if old token is already consumed or in legacy blacklist → return 0 (already used)
2. Mark old token as "consumed" with TTL
3. Store encrypted rotation result (AES-256-GCM encrypted new tokens)
4. Create index and reverse-lookup keys for the rotation chain
5. All happens atomically — no partial state possible

#### Revocation Script (`REVOKE_REFRESH_SCRIPT`):

1. Mark the current token as "revoked"
2. Follow rotation chain (both forward and reverse) to revoke any linked tokens
3. Clean up all rotation metadata
4. This means: logging out **also invalidates any tokens created from a rotation**

#### Grace Period for Concurrent Requests:

When a token is rotated, there's a 3-second window where a concurrent request using the old token can receive the same rotation result (encrypted, AES-256-GCM). This prevents mobile apps with concurrent requests from being spuriously logged out.

**Token hashing**: Token values are SHA-256 digested before use as Redis keys — raw JWTs never stored.

### 5.3 Security Layers Summary

| Layer                 | Implementation                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Helmet**            | Strict CSP on all routes (relaxed only for Swagger UI)                                                         |
| **CORS**              | Explicit origin allowlist; HTTPS required in prod                                                              |
| **CSRF**              | Double-submit cookie with `timingSafeEqual()`                                                                  |
| **Fetch Metadata**    | Rejects `Sec-Fetch-Site: cross-site` without validated Origin                                                  |
| **Rate Limiting**     | Global + auth-specific + dashboard-scoped; Redis store in prod                                                 |
| **Idempotency**       | PostgreSQL-backed mutation replay with lease semantics                                                         |
| **Input Validation**  | Zod v4 at validated request boundaries; a few narrow endpoints, such as logout, handle optional input directly |
| **RBAC**              | `authenticate` → `authorize('ADMIN')` middleware chain                                                         |
| **Vendor Isolation**  | Service-layer checks: vendors can only modify their own resources                                              |
| **Vendor Approval**   | `requireApprovedVendor` middleware for vendor operations                                                       |
| **Credential Safety** | Live payment keys rejected at startup                                                                          |

---

## 6. Payment System — The Showpiece

> [!TIP]
> The payment system is the most technically impressive part. Spend time mastering this.

### 6.1 Hybrid Payment Architecture

The system supports **two payment providers** — Stripe and Razorpay — with a **Strategy pattern**:

```
PaymentGateway (interface)
├── StripeGateway (implements PaymentGateway)
└── RazorpayGateway (implements PaymentGateway)
```

A `paymentGatewayFor(provider)` registry function returns the correct implementation.

#### Provider Assignment Rules:

- Indian vendors (`settlementCountry: "IN"`) → Razorpay (Route transfers)
- Non-Indian vendors → Stripe (Connect transfers)
- **Mixed-provider carts are rejected** — customer must check out separately
- Provider assignment is **server-side only** — client cannot choose

### 6.2 Checkout Flow

```
Customer → createCheckout() → validates order → checks vendor onboarding
  → calculates allocations (largest-remainder) → upserts PENDING earnings
  → acquires DB lease
  → calls provider SDK → returns checkout details to client
  → client completes payment → webhook fires → handleWebhook()
  → payment confirmed → transfer outcomes update earnings
```

Notifications are not a universal payment-confirmation step. Stripe can notify
a vendor after a later successful earning transfer; Razorpay payment
confirmation itself does not send that push notification.

### 6.3 Largest-Remainder Payment Allocation

From [payment-allocation.ts](../../backend/src/modules/payment/payment-allocation.ts):

**Problem**: Order total after discount must be split across vendors. But integer division loses fractional paise.

**Solution**: [Largest-remainder method](https://en.wikipedia.org/wiki/Largest_remainder_method):

1. Calculate each vendor's share: `floor(totalMinor × vendorSubtotal / totalSubtotal)`
2. Find unallocated remainder
3. Distribute 1 paisa each to vendors with the largest fractional remainders
4. Calculate commission per vendor: `round(gross × commissionBasisPoints / 10,000)`
5. Net = gross − commission

**Why this matters**: Ensures `sum(vendor allocations) === total` exactly. No floating-point drift. Vendor transfers can never exceed the captured payment.

### 6.4 Refund System

Two-phase refund:

1. **Database reservation**: In a serializable transaction, validate the
   succeeded payment and refundable balance, then create or reclaim a
   `PaymentRefund` record with a provider-operation lease.
2. **Provider and finalization**: Call Stripe/Razorpay after commit, persist the
   provider result, and, on provider-refund success, attempt vendor-transfer
   reversals. Once cumulative successful provider refunds cover the paid amount,
   the payment becomes `REFUNDED` even if a vendor reversal failed; that failure
   remains recorded in `reversalStatus` for reconciliation.

**Why two-phase?** If the provider result is failed or unknown, the refund
remains auditable through `PaymentRefund` and can be reconciled safely. This
payment refund path does not cancel the order or restore inventory.

Refund states: `PENDING → SUCCEEDED | FAILED`
Reversal states (vendor transfer): `PENDING → PROCESSING → SUCCEEDED | FAILED`

### 6.5 Deterministic Razorpay Mock

For local development without a Razorpay Test Mode account:

- Produces stable, predictable IDs: `order_mock_*`, `pay_mock_*`, `trf_mock_*`, `rfnd_mock_*`
- Generates valid deterministic test signatures
- Production startup **refuses** mock mode

---

## 7. Flutter Applications

### 7.1 Architecture — VGV Four-Layer Pattern

All three Flutter apps follow [Very Good Ventures architecture](https://www.verygood.ventures/blog/very-good-flutter-architecture):

```
lib/
├── core/           # Theme, routing (GoRouter), network (Dio), DI (GetIt)
├── repositories/   # Data-access layer (API calls via Dio)
├── features/
│   └── <feature>/
│       ├── bloc/   # BLoC/Cubit + State + Events
│       ├── view/   # Screen widgets (*_page.dart)
│       └── widgets/# Feature-scoped UI components
└── shared/
    ├── models/     # Cross-feature data models
    └── widgets/    # Reusable UI (SkeletonBox, EmptyState, ErrorState)
```

### 7.2 Storefront Features

| Feature                | Key Implementation Detail                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Auth**               | BLoC pattern with `AuthCheckRequested` on startup; GoRouter auth-aware redirects |
| **Product browsing**   | Category filters, search with auto-suggest, sort by price/rating/newest          |
| **Cart**               | Variant-level items, multi-vendor cart, promo code application                   |
| **Checkout**           | Stripe Payment Sheet (flutter_stripe) + Razorpay Standard Checkout               |
| **Orders**             | Status timeline, cancel/return flow                                              |
| **Wishlist**           | Add/remove/list with optimistic updates                                          |
| **Push notifications** | Firebase Messaging with background handler                                       |
| **Dark mode**          | ThemeCubit persists preference via SharedPreferences                             |
| **Deep linking**       | `storefrontapp://product/:id`, `storefrontapp://orders/:id`                      |
| **Splash screen**      | flutter_native_splash with 5-second safety fallback                              |

### 7.3 Key Technical Choices

| Choice                          | Why                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| **BLoC over Riverpod/Provider** | Industry standard for larger apps. Separates UI from business logic. Highly testable.      |
| **GoRouter**                    | Declarative routing with auth-aware redirects. Deep link support.                          |
| **Dio**                         | Full-featured HTTP client with interceptor support (auth token injection, error handling). |
| **GetIt**                       | Service locator for dependency injection. Simpler than full DI frameworks.                 |
| **flutter_secure_storage**      | Securely stores JWT tokens in platform keychain/keystore.                                  |

### 7.4 App Initialization Sequence

From [main.dart](../../storefront/lib/main.dart):

```
1. WidgetsFlutterBinding.ensureInitialized()
2. Preserve native splash screen
3. Firebase.initializeApp()
4. Register background message handler
5. Validate payment configuration (reject non-test Stripe keys)
6. Initialize Stripe SDK
7. Initialize all GetIt dependencies
8. runApp()
9. AuthBloc dispatches AuthCheckRequested → GoRouter redirects
10. Native splash removed when auth state resolves
11. 5-second safety fallback removes splash if auth never resolves
```

---

## 8. Web Workspace (Next.js Monorepo)

### 8.1 Architecture

**pnpm + Turborepo** monorepo with 2 apps and 8 shared packages:

```
root/
├── apps/
│   ├── vendor-dashboard/  (Next.js 16, port 3001)
│   └── admin-panel/       (Next.js 16, port 3002)
├── packages/
│   ├── api-client/        # Auto-generated OpenAPI TypeScript types
│   ├── auth/              # Cookie-based auth, BFF proxy, CSRF
│   ├── config/            # Shared environment/build config
│   ├── observability/     # Deployment metadata
│   ├── query/             # TanStack Query hooks
│   ├── schemas/           # Shared Zod validation
│   ├── test-utils/        # MSW handlers, fixtures
│   └── ui/                # Shared React design system
└── e2e/                   # Playwright + axe-core tests
```

### 8.2 Key Web Architecture Decisions

| Feature           | Technology                                 | Why                                                                 |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| **Data fetching** | TanStack React Query                       | Caching, optimistic updates, background refetching                  |
| **Tables**        | TanStack React Table                       | Headless, type-safe, supports sorting/filtering/pagination          |
| **Forms**         | React Hook Form + @hookform/resolvers      | Performant (uncontrolled), Zod integration                          |
| **API types**     | Auto-generated from `backend/openapi.json` | Type safety across client-server boundary, contract drift detection |
| **Auth**          | Cookie-based BFF proxy                     | Prevents XSS token theft; HMAC-signed rate-limit identity           |
| **Testing**       | Vitest + RTL + MSW                         | Fast, realistic API mocking at network level                        |
| **E2E**           | Playwright + axe-core                      | Cross-browser + accessibility testing                               |

### 8.3 OpenAPI Contract-First Development

```
1. Backend generates openapi.json (committed)
2. CI runs api:types:check to detect contract drift
3. If drift detected → fail CI → developer runs api:generate
4. Generated types in @repo/api-client consumed by dashboards
```

This means: **if the backend API changes, the web frontends won't compile until types are regenerated**. Contract safety at build time.

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
     ╱╲
    ╱E2E╲         7 Playwright specs (smoke, workflows, accessibility)
   ╱──────╲
  ╱ Integ  ╲     14 integration tests (real DB, API contract tests)
 ╱──────────╲
╱   Unit     ╲   17 unit tests (services, middleware, algorithms)
╱──────────────╲
```

### 9.2 Backend Tests

**Unit tests** ([`__tests__/unit/`](../../backend/__tests__/unit)):

- `auth.service.test.ts` — Registration, login, token refresh, logout
- `order.service.test.ts` — Order creation, cancellation, status transitions
- `payment.service.test.ts` — Checkout, webhooks, refunds (42KB — largest test file!)
- `payment-allocation.test.ts` — Largest-remainder allocation correctness
- `dashboard-bff-rate-limit.test.ts` — HMAC signature verification
- `migration-safety.test.ts` — Prisma migration policy compliance
- OpenAPI contract tests — ensure API docs match implementation

**Integration tests** ([`__tests__/integration/`](../../backend/__tests__/integration)):

- Integration suites cover core API domains with real PostgreSQL and Redis;
  additional module behavior is covered by unit, contract, and security suites.
- These tests exercise request→middleware→controller→service→database paths
  for the domains they cover.

### 9.3 Web Tests

- **Unit**: Vitest + React Testing Library per app and shared package
- **Critical regressions**: Dedicated `test:critical` scripts for vendor and admin dashboards
- **E2E**: Playwright with:
  - `dashboard-smoke.spec.ts` — basic health
  - `vendor-workflows.spec.ts` — full vendor flows
  - `admin-workflows.spec.ts` — full admin flows
  - `*-accessibility.spec.ts` — axe-core accessibility audits
  - `vendor-parity-layout.spec.ts` — layout consistency

### 9.4 CI Test Infrastructure

CI spins up real **PostgreSQL 16** and **Redis 7** service containers for
integration and E2E coverage. Those suites catch SQL and distributed-state
issues that in-memory substitutes would miss; unit and web tests still use
targeted mocks for providers, Prisma/fetch boundaries, and browser APIs.

---

## 10. DevOps, CI/CD & Deployment

### 10.1 Docker

[Multi-stage Dockerfile](../../backend/Dockerfile):

```
Stage 1 (builder):  Full Node.js + TypeScript compilation + Prisma generation
Stage 2 (migration): One-shot migration runner (separate from app)
Stage 3 (production): Lean runtime with only production deps + compiled JS
```

Security:

- Non-root user (`appuser`)
- Health check built into container definition
- Production containers **never** apply schema changes during startup

### 10.2 CI Pipeline

From [ci.yml](../../.github/workflows/ci.yml):

**Two parallel jobs** — backend and web run independently:

**Backend job:**

1. Setup Node.js + npm ci
2. Generate Prisma client
3. Lint
4. Check OpenAPI snapshot
5. Apply migrations + run tests (with real Postgres + Redis)
6. Build

**Web job:**

1. Setup pnpm + Node.js
2. Install dependencies (frozen lockfile)
3. Prepare E2E database
4. Format check → API type check → Lint → Typecheck
5. Critical regression tests
6. Unit tests → Production build → Source map verification
7. Playwright E2E (with backend auto-started)
8. E2E cleanup (database + Redis)

### 10.3 Deployment

| Component          | Platform         |
| ------------------ | ---------------- |
| Backend API        | Railway (Docker) |
| PostgreSQL         | Railway          |
| Redis              | Railway          |
| Next.js dashboards | Vercel           |

### 10.4 Database Migrations

Audited, environment-protected workflow (`database-migrate.yml`):

- Manual dispatch only (staging or production)
- Immutable release SHA
- Backup verification
- Evidence artifacts
- Contract-phase gating

---

## 11. Key Design Patterns & Architectural Decisions

### Patterns to Mention in Interviews

| Pattern                  | Where Used         | Explanation                                                                     |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------- |
| **Strategy Pattern**     | Payment gateway    | `PaymentGateway` interface with Stripe/Razorpay implementations                 |
| **Repository Pattern**   | Flutter apps       | Repositories abstract data access from BLoCs                                    |
| **BLoC Pattern**         | All Flutter apps   | Separates UI from business logic via events → states                            |
| **Service Layer**        | Backend modules    | Business logic isolated from HTTP concerns                                      |
| **Middleware Pipeline**  | Express app        | Composable request processing chain                                             |
| **Double-Submit Cookie** | CSRF protection    | Cookie + header token with timing-safe comparison                               |
| **Optimistic Locking**   | Idempotency        | Lease-based claim with expiration                                               |
| **TOCTOU Guard**         | Order creation     | Re-fetch inside transaction to prevent time-of-check-to-time-of-use races       |
| **Fire-and-Forget**      | Notifications      | `.catch()` for non-critical side effects (notifications don't block order flow) |
| **Largest-Remainder**    | Payment allocation | Fair integer-only money distribution                                            |
| **Monorepo**             | Web workspace      | Shared packages across apps with Turborepo build orchestration                  |
| **Contract-First API**   | OpenAPI codegen    | Generated types ensure client-server type safety                                |
| **Multi-Stage Docker**   | Backend            | Builder stage for compilation, lean production image                            |

### Architecture Decisions

| Decision                    | Alternative Considered | Why This Choice                                                            |
| --------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| REST over GraphQL           | GraphQL                | REST is simpler for CRUD-heavy e-commerce. Swagger provides documentation. |
| PostgreSQL over MongoDB     | MongoDB                | E-commerce is relational. Joins, transactions, referential integrity.      |
| Prisma over Drizzle/TypeORM | Drizzle, TypeORM       | Best DX with type-safe queries, migration tooling, and schema DSL.         |
| BLoC over Riverpod          | Riverpod               | BLoC is more structured for large teams. Explicit event/state separation.  |
| pnpm over npm for monorepo  | npm workspaces         | Faster installs, strict dependency resolution, workspace support.          |
| Zod over Joi/Yup            | Joi                    | TypeScript-first, `z.infer` for type inference, smaller bundle.            |
| Express 5 over Fastify      | Fastify                | Largest ecosystem, Express 5 adds async error handling natively.           |

---

## 12. Likely Interview Questions & Answers

### Architecture Questions

**Q: "Walk me through what happens when a customer places an order."**

> The customer calls `POST /api/v1/orders` with an address ID and optional promo code. Pre-transaction, we validate the cart isn't empty, the address belongs to the user, and the promo code is valid. Then inside a Prisma interactive transaction: we re-fetch the cart for fresh stock (TOCTOU guard), validate every item is active and in stock, calculate subtotal, re-validate the promo inside the transaction, calculate discount and total, generate a cryptographically-random order number, snapshot the shipping address as JSON, create the Order, group cart items by vendor to create VendorOrders with OrderItems, decrement variant stock, atomically increment promo usage with raw SQL (`UPDATE WHERE usageCount < usageLimit`), record per-user promo usage with an atomic `INSERT WHERE count < limit`, clear the cart, and return the full order. After the transaction, the client calls createCheckout to initiate payment.

**Q: "How do you handle a multi-vendor order?"**

> A customer order is split into VendorOrders — one per vendor. Each VendorOrder has its own status, tracking number, and carrier because vendors fulfill independently. The payment allocation uses the largest-remainder method to distribute the captured total in integer paise across vendors, then calculates commission per vendor. Checkout upserts a `PENDING` VendorEarning for each VendorOrder before calling the provider; later payment and transfer events advance those records. This means one vendor can be "Shipped" while another is "Processing."

**Q: "Why not use a message queue like RabbitMQ or Kafka?"**

> For this portfolio scale, direct database transactions provide strong consistency. Notifications use fire-and-forget (`Promise.catch()`). In a production system with higher throughput, I'd introduce a message queue for order events, payment webhooks, and notification delivery. The current architecture cleanly separates concerns so adding a queue layer would be straightforward.

### Security Questions

**Q: "How do you prevent CSRF attacks?"**

> Flutter clients use Bearer tokens (not cookies), so they're inherently CSRF-safe. Web dashboards use HttpOnly cookies, so they need CSRF protection. I implement the double-submit cookie pattern: the server sets a CSRF cookie, the client reads it and sends it as a header. The server compares them using `crypto.timingSafeEqual()` to prevent timing attacks. Fetch Metadata (`Sec-Fetch-Site`) adds a second layer by rejecting cross-site mutations without a validated Origin.

**Q: "How do you handle token refresh safely?"**

> Token rotation uses Redis Lua scripts for atomicity. When refreshing, the old token is consumed and a new pair is issued in a single atomic operation. If a concurrent request arrives at another API instance with the same old token, it receives the encrypted rotation result (AES-256-GCM) from a 3-second grace cache instead of being logged out. Logout follows the rotation chain to revoke both the consumed and replacement tokens. Token values are SHA-256 hashed before use as Redis keys.

### Database Questions

**Q: "How do you prevent race conditions with promo codes?"**

> Two mechanisms: (1) Global usage limit uses raw SQL `UPDATE promo_codes SET usageCount = usageCount + 1 WHERE usageCount < usageLimit`. This is atomic — two concurrent transactions can't both pass the check. If affected rows = 0, the limit was reached. (2) Per-user limit uses `INSERT INTO promo_usages ... WHERE (SELECT COUNT(*) ...) < perUserLimit`. Again, atomic — the check and insert happen in one SQL statement, preventing TOCTOU races.

**Q: "Why snapshot the shipping address?"**

> The order stores `shippingAddress` as a JSON snapshot. If the user edits or deletes their address after placing the order, the order still shows where it was shipped. The `addressId` FK is kept for reference, and `onDelete: Restrict` prevents deleting an address used in orders.

### Payments Questions

**Q: "Explain how you split payments across vendors."**

> I use the largest-remainder method for fair integer allocation. Given the order total in paise (integer): compute each vendor's proportional share, take the floor, then distribute the remaining paise one-by-one to vendors with the largest fractional remainders. This ensures the sum exactly equals the total — no floating-point drift, vendor transfers never exceed the captured payment. Commission is calculated per vendor with basis-point precision.

**Q: "How do you handle webhook reliability?"**

> Webhook routes are mounted before rate limiters so provider retries aren't throttled. `PaymentWebhookEvent` has `@@unique([provider, eventId])` so duplicate events are idempotent — the handler checks for existing records before processing. For Razorpay, `x-razorpay-event-id` provides deduplication. Webhook signatures are verified before any state changes.

### DevOps Questions

**Q: "How does your CI pipeline work?"**

> Two parallel jobs — backend and web — run on every PR to dev or main. Backend runs lint, OpenAPI snapshot check, tests with real Postgres and Redis service containers, and build. Web runs formatting, API type drift check, lint, typecheck, critical regression tests, unit tests, production build, source map verification, Playwright E2E with the backend auto-started, and finally cleans up E2E data. Concurrency groups cancel in-progress runs when a new commit is pushed.

**Q: "How do you ensure type safety between backend and frontend?"**

> The backend generates an `openapi.json` file that's committed to the repo. A codegen tool generates TypeScript types into `@repo/api-client`. CI runs `api:types:check` to detect contract drift — if the backend API changed but types weren't regenerated, CI fails. This catches type mismatches at build time, not runtime.

---

## 13. Terminology Cheat Sheet

| Term                     | Meaning in This Project                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **BFF**                  | Backend-For-Frontend — Next.js server-side proxy that handles auth cookies and forwards requests to the API                                  |
| **TOCTOU**               | Time-of-check-to-time-of-use — a race condition where data changes between validation and use. Prevented by re-checking inside transactions. |
| **Largest-Remainder**    | Algorithm for fairly distributing a total integer amount across vendors without floating-point errors                                        |
| **Double-Submit Cookie** | CSRF protection where a cookie value must match a header value, verified with timing-safe comparison                                         |
| **Idempotency Key**      | Client-generated UUID sent in headers to make retryable mutations safe (same request = same response)                                        |
| **Lease**                | Time-limited claim on an operation (e.g., checkout lease, idempotency lease) that auto-expires                                               |
| **VendorOrder**          | The per-vendor split of a customer order — each vendor fulfills their items independently                                                    |
| **Reconciliation**       | Process of verifying server-side state when a mutation outcome is ambiguous (e.g., after timeout)                                            |
| **Rotation**             | Token refresh that atomically invalidates the old token and issues new ones                                                                  |
| **Connect/Route**        | Stripe Connect and Razorpay Route — marketplace features for splitting payments to vendors                                                   |
| **Minor units**          | Currency amounts in smallest denomination (paise for INR, cents for USD) — integer-only arithmetic                                           |

---

> [!TIP]
> **Final advice**: When answering interview questions, always structure your answer as: **Problem → Solution → Why this approach over alternatives**. This shows depth of thinking, not just implementation knowledge.
