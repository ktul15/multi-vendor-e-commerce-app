# Deterministic web E2E data workflow

This workflow resets a dedicated PostgreSQL database and creates the vendor and admin dashboard fixtures used by Playwright. It never calls Stripe, Cloudinary, Firebase, or another external service.

## Safety contract

Both commands delete all application rows, including admin users. They run only when every condition below is true:

- `NODE_ENV` is not `production`.
- `WEB_E2E_RESET_CONFIRMATION=DELETE_E2E_DATA` is set explicitly.
- `DATABASE_URL` uses PostgreSQL and its database name is `testdb` or contains a `test`/`e2e` segment.
- `REDIS_URL` selects a dedicated nonzero Redis database; database 0 is never flushed.

Use a dedicated database. Never point these commands at a development, staging, or production database containing data that must be retained.

## Local usage

Apply migrations, then run the canonical workflow from the repository root:

```bash
cd backend
export DATABASE_URL=postgresql://testuser:testpass@localhost:5434/testdb
export REDIS_URL=redis://localhost:6379/15
export WEB_E2E_RESET_CONFIRMATION=DELETE_E2E_DATA
npm exec prisma migrate deploy
cd ..

pnpm run test:e2e
```

The runner clears the dedicated Redis database and seeds PostgreSQL immediately before the vendor project, repeats both resets before the admin project, and cleans up through an exit trap. It forces Playwright to start its own backend and dashboards with the guarded test URLs and refuses to reuse processes already occupying their ports. This prevents unrelated services, database mutations, sessions, cached values, and rate-limit counters from leaking into either dashboard suite. Extra Playwright arguments can be appended after `--`, for example `pnpm run test:e2e -- --workers=2`.

For a single project or fixture debugging, `db:seed` remains an alias for `db:e2e:seed`; pair it with `db:e2e:cleanup` and `cache:e2e:cleanup` when finished. Database seed and cleanup each use one transaction. Cleanup deletes children before parents to respect restrictive foreign keys, and every command can be run repeatedly. A failed database transaction leaves the prior database state intact.

## Stable fixtures

Database UUIDs are derived from stable fixture labels. Public identifiers also remain fixed between runs:

| Scenario | Stable selector | Password/state |
| --- | --- | --- |
| Admin | `alice.admin@example.com` | `admin123` |
| New customer | `ava.customer@example.com` | `password123`, no order history |
| Returning customer | `ben.customer@example.com` | `password123`, orders/cart/notifications |
| Wrong-role user | `mallory.user@example.com` | `password123`, customer role |
| Pending vendor | `vera.vendor@example.com` / `Vera New Goods` | `password123`, `PENDING` |
| Approved, Connect not started | `victor.vendor@example.com` / `Victor Marketplace` | `password123`, `APPROVED` / `NOT_STARTED` |
| Suspended vendor | `nina.vendor@example.com` / `Nina Restricted Store` | `password123`, `SUSPENDED` |
| Rejected vendor | `riley.vendor@example.com` / `Riley Rejected Goods` | `password123`, `REJECTED` |
| Approved, Connect complete | `olivia.vendor@example.com` / `Olivia Home & Style` | `password123`, `APPROVED` / `COMPLETE` |

Additional stable families are:

- Vendors: `qa.vendor.realworld.<n>@example.com` and `QA Vendor Store REALWORLD <nn>` across every lifecycle state.
- Products and variants: `QA Product REALWORLD <nn>` and `QA-REALWORLD-<nn>-A` (plus `-B` for product 1), including active, inactive, in-stock, and out-of-stock records.
- Orders: `QA-REALWORLD-<nnnnn>` across every order status.
- Categories, promos, and banners: `QA_CAT_REALWORLD_*`, `QA_PROMO_REALWORLD_<nn>`, and `QA_BANNER_REALWORLD_<nn>`.

Dates are relative to the seed run so date-range dashboards remain meaningful. Tests should select fixtures by these stable public identifiers rather than database insertion order.

## Stripe-safe states

Values beginning with `acct_qa_`, `pi_qa_`, `tr_qa_`, and `po_qa_` are inert database fixtures. They deliberately do not use Stripe test-mode syntax and must never be submitted to Stripe APIs. The seed covers Connect not-started/pending/complete states, card and cash-on-delivery payments, transferred/pending earnings, and paid/pending/failed payouts.

## CI lifecycle

The web quality-gate job migrates its ephemeral `testdb` and invokes the same `pnpm run test:e2e` orchestration used locally. It uploads failure artifacts and also invokes independent PostgreSQL and Redis cleanup steps with `if: always()` as a fallback if the runner is forcibly terminated. One cleanup failure therefore cannot skip the other. CI and local runs use the same commands, project isolation, and safety checks.
