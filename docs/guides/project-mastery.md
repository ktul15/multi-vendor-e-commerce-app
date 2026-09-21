# 🎯 Project Mastery Guide — Multi-Vendor E-Commerce App

This guide will take you from "I built this" to "I can explain every single decision" in **10 structured phases**. Each phase has a clear goal, specific files to study, concepts to internalize, and interview-ready talking points.

> [!TIP]
> **Study approach**: Don't just _read_ — after each phase, close your editor and explain the concept out loud (or write it down) as if someone asked you in an interview. If you get stuck, go back to the source.

---

## Phase 1: System Architecture (The Big Picture)

**Goal**: Be able to draw the entire architecture on a whiteboard and explain every connection.

### What to Study

| Resource             | Path                                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| Architecture diagram | [README.md](../../README.md#L7-L36)                                              |
| Full project scope   | [PROJECT_SCOPE.md](../../PROJECT_SCOPE.md)                                       |
| Monorepo config      | [pnpm-workspace.yaml](../../pnpm-workspace.yaml), [turbo.json](../../turbo.json) |

### Concepts to Internalize

1. **Monorepo structure**: Why one repo with 6 apps (backend, storefront, vendor_dashboard Flutter, admin_panel Flutter, vendor-dashboard Next.js, admin-panel Next.js) + 8 shared packages?
   - _Answer_: Shared validation schemas (`@repo/schemas`), generated API types (`@repo/api-client`), shared UI (`@repo/ui`), and auth helpers (`@repo/auth`) eliminate duplication. Turborepo caches builds. pnpm saves disk with hardlinks.

2. **Communication pattern**: There is one REST business backend and no
   GraphQL service. Flutter clients call it directly; browser dashboards call
   in-app Next.js BFF route handlers that protect cookies and proxy requests to
   that same backend rather than implementing a second business API.
   - _Why REST over GraphQL?_: Simpler to reason about, better tooling ecosystem (Swagger/OpenAPI), easier caching, and more interview-friendly to explain.

3. **Dual frontend approach**: Flutter (mobile-native experience) + Next.js (web dashboards).
   - _Why not just Flutter Web for dashboards?_: Next.js provides SSR, better SEO (not needed for dashboards but shows skill), React ecosystem libraries (TanStack Table/Query), and showcases polyglot skills.

### Practice Questions

- [ ] "Draw me the architecture of your project."
- [ ] "Why did you choose a monorepo over separate repositories?"
- [ ] "How do the Flutter apps and Next.js apps communicate with the backend?"
- [ ] "What would you change if this needed to scale to 10,000 concurrent users?"

---

## Phase 2: Database Design & Data Modeling

**Goal**: Explain every table, every relationship, every design trade-off.

### What to Study

| Resource                  | Path                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Prisma schema             | [schema.prisma](../../backend/prisma/schema.prisma)                                  |
| ER diagram                | [PROJECT_SCOPE.md § Database Schema](../../PROJECT_SCOPE.md#L244-L431)               |
| Migration safety tests    | [migration-safety.test.ts](../../backend/__tests__/unit/migration-safety.test.ts)    |
| Migration rollout runbook | [database-migration-rollout.md](../../docs/operations/database-migration-rollout.md) |

### Key Design Decisions to Know Cold

#### 1. Multi-vendor order splitting (the hardest part)

```
Order (customer places one order)
  └── VendorOrder (one per vendor in the cart)
       └── OrderItem (individual items for that vendor)
```

- **Why?** A single cart can have items from 5 vendors. Each vendor needs independent fulfillment (confirm → pack → ship). The `VendorOrder` model enables per-vendor status tracking without blocking other vendors.
- The parent `Order` has no `status` field — status is derived from its `VendorOrder` children.

#### 2. Address snapshotting

```prisma
model Order {
  addressId       String       // FK for reference
  shippingAddress Json         // Snapshot at order time
}
```

- **Why?** If user edits their address after ordering, the order should reflect the _original_ address. `addressId` FK is kept for reference; `shippingAddress` JSON is the source of truth.

#### 3. Denormalized aggregates

```prisma
model Product {
  avgRating   Decimal  @default(0.0)
  reviewCount Int      @default(0)
}
```

- **Why?** Avoids expensive `AVG()` joins on every product listing. Must be updated **atomically** in a transaction alongside Review writes (never stale).

#### 4. Soft delete for promo codes

```prisma
model PromoCode {
  deletedAt DateTime?  // null = active, non-null = soft-deleted
}
```

- **Why?** `PromoUsage` records reference promo codes for audit trails. Hard deleting would break FK integrity. The `onDelete: Restrict` on PromoUsage → PromoCode prevents accidental hard deletes.

#### 5. Idempotency records

```prisma
model IdempotencyRecord {
  scope     String    // "VENDOR:uuid" or "CUSTOMER:uuid"
  key       String    // Client-provided Idempotency-Key
  state     String    // IN_PROGRESS | COMPLETED | AMBIGUOUS
  @@unique([scope, key])
}
```

- **Why?** Network failures can cause clients to retry side-effecting operations.
  The current middleware protects vendor-order status transitions, coordinating
  duplicate requests and providing an authoritative reconciliation path.

### Indexes to Explain

- `@@index([userId, isRead])` on Notification — optimizes "get my unread notifications" query
- `@@index([productId, rating])` on Review — supports "reviews sorted by rating" for a product
- `@@unique([userId, productId])` on Review — one review per user per product
- `@@unique([cartId, variantId])` on CartItem — prevents duplicate variants in cart
- `@@unique([orderId, vendorId])` on VendorOrder — one sub-order per vendor per order

### Practice Questions

- [ ] "Walk me through what happens in the database when a customer places an order with items from 3 different vendors."
- [ ] "Why did you snapshot the shipping address instead of just using a foreign key?"
- [ ] "How do you prevent a user from reviewing the same product twice?"
- [ ] "What indexing strategy did you use and why?"
- [ ] "How would you handle database migrations in production?"

---

## Phase 3: Backend Deep-Dive

**Goal**: Explain every middleware, every module structure, every design pattern.

### What to Study

| Resource                         | Path                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------- |
| Express app setup                | [app.ts](../../backend/src/app.ts)                                                |
| Server entry & graceful shutdown | [server.ts](../../backend/src/server.ts)                                          |
| Auth middleware                  | [auth.ts](../../backend/src/middleware/auth.ts)                                   |
| Validation middleware            | [validate.ts](../../backend/src/middleware/validate.ts)                           |
| Error handler                    | [errorHandler.ts](../../backend/src/middleware/errorHandler.ts)                   |
| Upload middleware                | [upload.ts](../../backend/src/middleware/upload.ts)                               |
| Vendor approval guard            | [requireApprovedVendor.ts](../../backend/src/middleware/requireApprovedVendor.ts) |

### Module Pattern (Know This by Heart)

Most feature modules follow this **four-file convention**:

```
src/modules/<name>/
├── <name>.routes.ts         # Router + middleware chain
├── <name>.controller.ts     # Extract req data → call service → send response
├── <name>.service.ts        # Business logic + Prisma queries
└── <name>.validation.ts     # Zod schemas + inferred TS types
```

Small modules can be narrower (`health` currently contains only routes), `auth`
uses `auth.schema.ts`, and complex domains may add specialized files.

**Why this pattern?**

- **Separation of concerns**: Controllers don't know about Prisma. Services don't know about HTTP.
- **Testability**: Services can be unit-tested without Express. Controllers can be tested with mocked services.
- **Validation at the boundary**: Zod schemas ensure type-safe request data before it reaches the controller.

### Middleware Chain Order (Critical to Understand)

Study [app.ts](../../backend/src/app.ts) carefully — the order matters:

```
1. helmet()              — Security headers (CSP, HSTS, etc.)
2. cors(corsOptions)     — Origin allowlist
3. express.json()        — Body parsing (with rawBody capture for Stripe)
4. csrfProtection        — CSRF double-submit cookie
5. healthRouter          — BEFORE rate limiting (for load balancer probes)
6. paymentWebhookRouter  — BEFORE rate limiting (Stripe retries must not be throttled)
7. globalLimiter              — Global IP or signed-dashboard identity limit
8. dashboardClientLimiter     — Per-dashboard-client limit
9. dashboardAggregateLimiter  — Per-dashboard-source aggregate limit
10. morgan                    — Logging
11. Swagger UI                — Dev only, with relaxed CSP
12. Feature routes            — All /api/v1/* routes
13. notFoundHandler           — 404 catch-all
14. errorHandler              — Global error handler
```

> [!IMPORTANT]
> The health check and webhook routes are mounted **before** the rate limiter. This is a production decision — Railway uses health checks to route traffic, and Stripe will retry webhooks that get 429'd.

### Key Backend Concepts to Master

#### Request lifecycle example: `POST /api/v1/orders`

```
Request → CORS → JSON parse → CSRF check → Rate limit
  → authenticate (JWT verify → req.user)
    → authorize('CUSTOMER')
      → validate(createOrderSchema) (Zod)
        → orderController.createOrder()
          → orderService.createOrder() (business logic + Prisma transaction)
            → Response (201 + order data)
```

#### Graceful shutdown

Study [server.ts](../../backend/src/server.ts#L43-L52):

- `SIGTERM` / `SIGINT` → disconnect Redis → disconnect Prisma → close pg pool → exit
- Prevents connection leaks during deployments

### Practice Questions

- [ ] "Walk me through the middleware chain when a request hits your API."
- [ ] "Why are webhook routes mounted before the rate limiter?"
- [ ] "How does your validation work? Why Zod over Joi/Yup?"
- [ ] "Explain the difference between your controller and service layers."
- [ ] "How does your error handling work end-to-end?"
- [ ] "How do you handle graceful shutdown? Why does it matter?"

---

## Phase 4: Security (Interview Gold)

**Goal**: Security questions are common in senior-level interviews. Be able to explain each layer in depth.

### What to Study

| Resource                   | Path                                                          |
| -------------------------- | ------------------------------------------------------------- |
| CSRF middleware            | [csrf.ts](../../backend/src/middleware/csrf.ts)               |
| Rate limiter (multi-layer) | [rateLimiter.ts](../../backend/src/middleware/rateLimiter.ts) |
| Idempotency middleware     | [idempotency.ts](../../backend/src/middleware/idempotency.ts) |
| CORS config                | [cors.ts](../../backend/src/middleware/cors.ts)               |
| Auth middleware            | [auth.ts](../../backend/src/middleware/auth.ts)               |

### Security Layers (7 Deep)

#### 1. Helmet — HTTP Security Headers

- Content-Security-Policy, X-Content-Type-Options, Strict-Transport-Security
- **Relaxed only** for Swagger UI (needs inline scripts from cdn.jsdelivr.net)

#### 2. CORS — Origin Allowlist

- Explicit allowlist of frontend origins (storefront URL, dashboard URLs)
- Production requires HTTPS origins

#### 3. CSRF — Double-Submit Cookie Pattern

- **Web dashboards** (cookie-based auth): CSRF cookie + `X-CSRF-Token` header must match
- **Flutter apps** (Bearer token auth): Bypass CSRF entirely — Bearer tokens aren't automatically attached by browsers, so CSRF is irrelevant
- Uses `timingSafeEqual()` to prevent timing attacks on token comparison

> [!IMPORTANT]
> **Key insight**: The CSRF middleware intelligently differentiates between cookie-based and token-based clients. This is a real-world pattern — explain it as: "Browser cookies are vulnerable to CSRF because they're sent automatically. Bearer tokens require JavaScript to attach them, so a CSRF attack can't forge them."

#### 4. Fetch Metadata — Cross-Site Mutation Blocking

- Checks `Sec-Fetch-Site` header — rejects cross-site mutations without a validated `Origin`
- Defense-in-depth alongside CORS

#### 5. Rate Limiting — Multi-Layer Strategy

```
Global limiter (all routes)         — IP-based (100 req/15min prod)
├── Auth limiter (login/register)   — Stricter (10 req/15min prod)
├── Dashboard client limiter        — Per-client hash (300 req/15min)
└── Dashboard aggregate limiter     — Per-source app (10,000 req/15min)
```

- **Dashboard BFF identity**: HMAC-signed headers prove the request came from a trusted Next.js server, allowing rate limiting by user identity instead of IP (important behind CDN/proxy)

#### 6. JWT Auth — Dual-Channel

- **Flutter apps**: Bearer token in `Authorization` header
- **Web dashboards**: HttpOnly cookies prevent client-side JavaScript from
  directly reading tokens. XSS can still perform actions through an authenticated
  browser session, so output encoding and CSP remain separate defenses.
- Access token: 15 min TTL → Refresh token: 7 days → logout revokes the refresh
  token lineage in Redis. An already issued access token remains valid until its
  signature expires, leaving a residual window of up to 15 minutes.

#### 7. Idempotency — Mutation Replay Safety

- `Idempotency-Key` header → PostgreSQL-backed coordination
- States: `IN_PROGRESS` → `COMPLETED` or `AMBIGUOUS`
- Lease-based: 2-minute execution window, 24-hour record TTL
- Currently protects vendor-order status transitions from duplicate execution;
  order creation and payment checkout use their own transactional/lease controls
  and do not mount this middleware.

### Practice Questions

- [ ] "How do you protect against CSRF attacks? Why don't your Flutter apps need CSRF protection?"
- [ ] "Explain your rate limiting strategy. How does it work behind a CDN/proxy?"
- [ ] "What is the idempotency middleware and why do you need it?"
- [ ] "How do you handle JWT token refresh? What happens when a token is compromised?"
- [ ] "What's `timingSafeEqual` and why do you use it instead of `===`?"

---

## Phase 5: Payment System (The Most Impressive Part)

**Goal**: Payment integration is the #1 thing clients/interviewers care about. Know this cold.

### What to Study

| Resource                  | Path                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Payment gateway interface | [payment-gateway.ts](../../backend/src/modules/payment/providers/payment-gateway.ts)                   |
| Gateway registry          | [payment-gateway.registry.ts](../../backend/src/modules/payment/providers/payment-gateway.registry.ts) |
| Stripe gateway            | [stripe.gateway.ts](../../backend/src/modules/payment/providers/stripe.gateway.ts)                     |
| Razorpay gateway          | [razorpay.gateway.ts](../../backend/src/modules/payment/providers/razorpay.gateway.ts)                 |
| Payment service           | [payment.service.ts](../../backend/src/modules/payment/payment.service.ts)                             |
| Hybrid sandbox docs       | [hybrid-sandbox-architecture.md](../../docs/payments/hybrid-sandbox-architecture.md)                   |
| Payment allocation        | [payment-allocation.ts](../../backend/src/modules/payment/payment-allocation.ts)                       |

### Architecture: Strategy Pattern for Payment Providers

```typescript
interface PaymentGateway {
  provider: PaymentProvider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  reuseCheckout(ref: string, request: CheckoutRequest): Promise<CheckoutSession | null>;
  cancel(ref: string): Promise<void>;
  createTransfer(input: {...}): Promise<string>;
  refund(input: {...}): Promise<RefundResult>;
  reverseTransfer(transferId: string, ...): Promise<void>;
}
```

- `StripeGateway` implements this → Stripe PaymentIntents, client Payment Sheet, and Connect
- `RazorpayGateway` implements this → Razorpay Orders + Route
- **Registry pattern**: `paymentGatewayFor(provider)` returns the right implementation
- **Why Strategy pattern?** The interface isolates provider-specific behavior.
  Adding a provider still requires an implementation plus registry, enum/schema,
  configuration, validation, and client-flow updates, but the core orchestration
  can continue to target the shared gateway contract.

### Vendor Payout Flow (Stripe Connect / Razorpay Route)

```
Customer pays → Payment.status = SUCCEEDED
  → Existing PENDING VendorEarning reconciled per VendorOrder
    → grossAmount - (commissionRate × grossAmount) = netAmount
      → Transfer to vendor's connected account
        → VendorEarning.status = TRANSFERRED
```

### Key Concepts

1. **Checkout lease**: Prevents duplicate checkout sessions if client retries. A lease token + expiry prevents concurrent checkout creation.
2. **Webhook idempotency**: `PaymentWebhookEvent` table with `@@unique([provider, eventId])` — processing the same webhook twice is a no-op.
3. **Refund with transfer reversal**: Refunding a payment must also reverse vendor transfers proportionally.
4. **Payment allocation**: Splits a single payment amount across multiple vendor orders based on their subtotals.
5. **Deterministic Razorpay mock**: Since Razorpay Route sandbox doesn't exist, the gateway returns mock `paymentId` and `signature` for E2E testing.

### Practice Questions

- [ ] "How does payment flow work when a cart has items from 3 vendors?"
- [ ] "Explain your payment gateway architecture. How would you add PayPal?"
- [ ] "What happens if the Stripe webhook fires but your server is down? How do you handle it when it comes back up?"
- [ ] "How do you handle refunds in a multi-vendor setup?"
- [ ] "What is Stripe Connect and how do you use it for vendor payouts?"
- [ ] "What's the difference between Stripe Checkout and PaymentIntents?"

---

## Phase 6: Flutter Frontends (Storefront + Vendor + Admin)

**Goal**: Explain the architecture, state management, and key flows.

### What to Study

| Resource               | Path                                                  |
| ---------------------- | ----------------------------------------------------- |
| Storefront entry point | [main.dart](../../storefront/lib/main.dart)           |
| DI container           | `storefront/lib/core/config/injection_container.dart` |
| Router config          | `storefront/lib/core/config/app_router.dart`          |
| Auth BLoC              | `storefront/lib/features/auth/bloc/auth_bloc.dart`    |
| Feature list           | `storefront/lib/features/` (14 features)              |
| Repositories           | `storefront/lib/repositories/`                        |
| Shared widgets         | `storefront/lib/shared/`                              |

### Architecture: VGV Four-Layer Pattern

```
┌──────────────────┐
│    Presentation   │  Screens (pages), widgets, BLoC listeners
├──────────────────┤
│    BLoC / Cubit   │  State management, events → states
├──────────────────┤
│    Repository      │  Data access abstraction
├──────────────────┤
│    Data Source      │  Dio HTTP calls, local storage
└──────────────────┤
```

**Key architectural decisions**:

1. **BLoC over Riverpod/Provider**: BLoC enforces unidirectional data flow (Event → BLoC → State). More boilerplate but extremely testable and scalable.

2. **GetIt for DI**: App-wide repositories and services are generally singleton
   or lazy-singleton dependencies, while many feature BLoCs/Cubits are
   factory-created; selected shared state objects are singletons. Registration
   completes in `initDependencies()` before `runApp()`.

3. **GoRouter with auth-aware redirects**: Router checks `AuthBloc` state — unauthenticated users are redirected to login; authenticated users skip the login screen.

4. **Splash screen coordination**: Native splash stays until `AuthBloc` resolves (authenticated or unauthenticated). 5-second safety timeout prevents permanent splash.

5. **Dio interceptors**: Token refresh interceptor catches 401 → refreshes token → retries original request. No manual token management in feature code.

### Key Flows to Understand

#### Checkout Flow (Storefront)

```
Cart screen → Select address → Apply promo (optional)
  → "Place Order" → API: POST /orders (creates Order + VendorOrders)
    → API: POST /payments/checkout (creates Stripe/Razorpay session)
      → Native payment sheet (Stripe) or Razorpay SDK
        → Webhook confirms payment → Order and earning state updates
```

Push notifications are event-specific rather than guaranteed at confirmation;
for example, Stripe can notify a vendor after a later successful earning
transfer.

#### Auth Flow

```
App launch → AuthCheckRequested event
  → Read stored tokens → Validate access token
    → Valid: AuthAuthenticated state → Home screen
    → Expired: Try refresh token → Success: AuthAuthenticated
    → Failed: AuthUnauthenticated → Login screen
```

### Practice Questions

- [ ] "Why BLoC over Provider/Riverpod for state management?"
- [ ] "Explain the VGV architecture you followed. What are the four layers?"
- [ ] "How does your token refresh work? What if both tokens are expired?"
- [ ] "Walk me through the checkout flow from the Flutter app perspective."
- [ ] "How do you handle deep linking in the storefront?"

---

## Phase 7: Web Workspace (Next.js + Shared Packages)

**Goal**: Explain the Turborepo monorepo setup and shared package architecture.

### What to Study

| Resource         | Path                                             |
| ---------------- | ------------------------------------------------ |
| Turborepo config | [turbo.json](../../turbo.json)                   |
| pnpm workspace   | [pnpm-workspace.yaml](../../pnpm-workspace.yaml) |
| Shared packages  | [packages/](../../packages) (8 packages)         |
| Web apps         | [apps/](../../apps)                              |
| E2E tests        | [e2e/](../../e2e)                                |

### Key Concepts

1. **`@repo/api-client`**: Auto-generated from `backend/openapi.json`. If the backend API changes, `pnpm run api:check` detects contract drift in CI.

2. **`@repo/auth`**: Cookie-based auth with BFF proxy + CSRF. Web dashboards never touch JWTs directly — the BFF handles it.

3. **BFF rate-limit identity**: The Next.js server-side proxy signs requests with HMAC so the backend can rate-limit by user, not by server IP.

4. **Turborepo caching**: Build outputs are cached by content hash. If `@repo/ui` didn't change, it isn't rebuilt.

### Practice Questions

- [ ] "What is a BFF (Backend-for-Frontend) and why do your web dashboards use one?"
- [ ] "How do you keep TypeScript types synchronized between backend and frontend?"
- [ ] "Explain how Turborepo improves your build times."
- [ ] "Why pnpm over npm/yarn for a monorepo?"

---

## Phase 8: DevOps & CI/CD

**Goal**: Explain your deployment pipeline, Docker setup, and operational practices.

### What to Study

| Resource              | Path                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| CI workflow           | [ci.yml](../../.github/workflows/ci.yml)                                             |
| Deploy workflow       | [deploy.yml](../../.github/workflows/deploy.yml)                                     |
| DB migration workflow | [database-migrate.yml](../../.github/workflows/database-migrate.yml)                 |
| Smoke test workflow   | [deployment-smoke.yml](../../.github/workflows/deployment-smoke.yml)                 |
| Dockerfile            | [Dockerfile](../../backend/Dockerfile)                                               |
| Docker Compose        | [docker-compose.yml](../../backend/docker-compose.yml)                               |
| Deployment runbook    | [vercel-railway-deployment.md](../../docs/operations/vercel-railway-deployment.md)   |
| DB migration rollout  | [database-migration-rollout.md](../../docs/operations/database-migration-rollout.md) |

### Deployment Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Railway     │     │   Railway     │
│ (Next.js     │────▶│   (Express   │────▶│ (PostgreSQL   │
│  dashboards) │     │    API)      │     │  + Redis)     │
└─────────────┘     └──────────────┘     └──────────────┘
```

### Key Concepts

1. **Git Flow**: `feature/*` → `dev` → `main`. Never commit to `main` directly.
2. **CI gates**: Backend runs lint + tests (with Postgres + Redis services). Web runs format + lint + typecheck + Vitest + build + Playwright E2E.
3. **Database migrations are NOT automatic**: Production uses a protected, audited GitHub Actions workflow with immutable release SHA, backup verification, and evidence artifacts. Docker containers **never** run migrations on startup.
4. **Smoke tests**: Post-deployment verification checks health endpoints, DB/cache readiness, and CORS configuration.

### Practice Questions

- [ ] "How do you handle database migrations in production?"
- [ ] "Explain your CI pipeline. What checks run on every PR?"
- [ ] "Why don't your Docker containers run migrations on startup?"
- [ ] "How would you roll back a bad deployment?"

---

## Phase 9: Testing Strategy

**Goal**: Explain your multi-level testing approach.

### What to Study

| Type                   | Location                                                      | Count                              |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Unit tests             | [**tests**/unit/](../../backend/__tests__/unit)               | Focused service and contract tests |
| Integration tests      | [**tests**/integration/](../../backend/__tests__/integration) | API and persistence behavior       |
| E2E tests (Playwright) | [e2e/](../../e2e)                                             | Cross-dashboard browser workflows  |
| Test config            | [jest.config.js](../../backend/jest.config.js)                |

### Testing Pyramid

```
        ╱ E2E (Playwright) ╲          ← smoke, workflows, accessibility
       ╱───────────────────╲
      ╱  Integration (Jest)  ╲        ← 14 test files: API contract tests with real DB
     ╱───────────────────────╲
    ╱    Unit Tests (Jest)     ╲      ← 17 test files: services, middleware, utilities
   ╱─────────────────────────────╲
```

### Notable Test Types

1. **OpenAPI contract tests**: Verify that API responses match the OpenAPI spec (`openapi.json`). Prevents contract drift between backend and generated frontend types.
2. **Migration safety tests**: Ensure migrations don't break existing data.
3. **Dashboard BFF rate-limit tests**: Verify HMAC-signed identity verification works correctly.
4. **Accessibility tests (axe-core)**: E2E tests include automated accessibility scanning.

### Practice Questions

- [ ] "What's your testing strategy? How do you decide what to unit test vs integration test?"
- [ ] "What are OpenAPI contract tests and why do you have them?"
- [ ] "How do you test your payment integration without charging real money?"
- [ ] "How do you handle test database isolation?"

---

## Phase 10: Interview & Client Preparation

**Goal**: Be ready for behavioral and system-design questions around this project.

### The 60-Second Elevator Pitch

> "I built a full-stack multi-vendor e-commerce platform — think of it as the infrastructure behind an Amazon-style marketplace. Three types of users — customers, vendors, and admins — each have their own dedicated app. A customer on the Flutter mobile app can browse products from multiple vendors, add them to a single cart, and checkout with Stripe or Razorpay. The order automatically splits by vendor so each can fulfill independently. Vendors manage their store through a dashboard — they track orders, earnings, and get payouts through Stripe Connect. The admin panel handles vendor approvals, product moderation, and platform analytics. The backend is a Node.js REST API with PostgreSQL, Redis for caching and rate-limiting, and a multi-layer security setup including CSRF protection, idempotency for safe retries, and JWT auth with both cookie and bearer token support for web and mobile clients."

### Top 10 "Why Did You...?" Answers

| Question                           | Answer                                                                                                                                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why PostgreSQL over MongoDB?       | Relational data is natural for e-commerce (users → orders → items → products). ACID transactions are critical for payments.                                                                                                                                                |
| Why Express 5 over Fastify/NestJS? | Express has the largest ecosystem, and v5 adds native async error handling. NestJS adds unnecessary abstraction for this project size.                                                                                                                                     |
| Why Prisma over raw SQL/TypeORM?   | Type-safe queries with auto-generated types. Migration system is reliable. Schema-as-code in `schema.prisma` is self-documenting.                                                                                                                                          |
| Why BLoC over GetX/Riverpod?       | BLoC enforces strict unidirectional data flow. Events and states are explicit — easier to debug, test, and maintain.                                                                                                                                                       |
| Why JWT over sessions?             | Stateless auth works across mobile (Flutter) and web (Next.js) without shared session storage. Refresh tokens provide good UX.                                                                                                                                             |
| Why Redis?                         | It coordinates distributed rate limits, refresh-token rotation/revocation, and caching. Logout revokes refresh credentials immediately, while an existing access token can remain valid for up to its 15-minute lifetime.                                                  |
| Why both Stripe and Razorpay?      | Administrators configure each vendor's provider and settlement country. Validation restricts Razorpay to India and Stripe to non-India settlement, while mixed-provider carts are rejected. The shared gateway contract keeps core payment orchestration provider-neutral. |
| Why monorepo?                      | Shared Zod schemas, shared API types, shared UI components. One PR can update backend API + frontend types + UI in lockstep.                                                                                                                                               |
| Why separate VendorOrder model?    | Multi-vendor fulfillment. Each vendor ships independently — they need their own status, tracking number, and earnings record.                                                                                                                                              |
| Why idempotency middleware?        | Networks are unreliable. The middleware currently makes vendor-order status retries replay-safe and exposes reconciliation for ambiguous outcomes.                                                                                                                         |

### System Design Follow-Ups

Be ready for these "what if" scaling questions:

1. **"How would you add real-time order tracking?"**
   → WebSockets or Server-Sent Events. Vendor status update → emit event → customer app receives real-time update. Could use Redis pub/sub for multi-instance coordination.

2. **"How would you add full-text search?"**
   → Currently using PostgreSQL `LIKE`/`ILIKE`. Leading-wildcard substring
   searches are not generally accelerated by the ordinary B-tree name index;
   production scale would need a PostgreSQL trigram/full-text index or a search
   service such as Elasticsearch or Meilisearch, synchronized through change
   data capture or background jobs.

3. **"How would you handle 10x traffic?"**
   → Horizontal scaling: multiple API instances behind a load balancer (already supported — Redis rate limiting is distributed). Database read replicas for read-heavy queries. CDN for static assets. Queue system (BullMQ + Redis) for async operations like email, notifications, and analytics aggregation.

4. **"How would you add multi-currency support?"**
   → The `Currency` enum already supports USD, EUR, GBP, INR, CAD, AUD. Would need exchange rate service, per-vendor currency configuration, and currency conversion at checkout time.

---

## 📅 Recommended Study Schedule

| Day   | Phase                                                       | Time      |
| ----- | ----------------------------------------------------------- | --------- |
| Day 1 | Phase 1 (Architecture) + Phase 2 (Database)                 | 3–4 hours |
| Day 2 | Phase 3 (Backend Deep-Dive)                                 | 3–4 hours |
| Day 3 | Phase 4 (Security) + Phase 5 (Payments)                     | 4–5 hours |
| Day 4 | Phase 6 (Flutter) + Phase 7 (Web/Next.js)                   | 3–4 hours |
| Day 5 | Phase 8 (DevOps) + Phase 9 (Testing)                        | 2–3 hours |
| Day 6 | Phase 10 (Interview Prep) — Practice all questions out loud | 2–3 hours |
| Day 7 | Mock interview with a friend or rubber duck 🦆              | 2 hours   |

> [!TIP]
> **The #1 interview hack**: For every answer, follow the **STAR format** — **S**ituation (what the problem was), **T**ask (what you needed to do), **A**ction (what you built), **R**esult (what it achieved). For technical decisions, follow **Decision → Alternatives Considered → Trade-offs → Why This Won**.

---

## 🔑 Files You Must Read End-to-End

These are the most architecturally significant files. Read every line:

1. [schema.prisma](../../backend/prisma/schema.prisma) — the complete data model
2. [app.ts](../../backend/src/app.ts) — middleware ordering
3. [payment.service.ts](../../backend/src/modules/payment/payment.service.ts) — payment orchestration
4. [order.service.ts](../../backend/src/modules/order/order.service.ts) — multi-vendor order logic
5. [idempotency.ts](../../backend/src/middleware/idempotency.ts) — production-grade retry safety
6. [csrf.ts](../../backend/src/middleware/csrf.ts) — dual-channel CSRF protection
7. [rateLimiter.ts](../../backend/src/middleware/rateLimiter.ts) — multi-layer rate limiting
8. [payment-gateway.ts](../../backend/src/modules/payment/providers/payment-gateway.ts) — Strategy pattern interface
9. [main.dart](../../storefront/lib/main.dart) — Flutter app initialization
10. [server.ts](../../backend/src/server.ts) — Server startup + graceful shutdown
