# Admin Panel Flutter-to-Next.js Parity Audit

Status: **Complete - go recommendation approved**

Issue: #122

Audited target: `apps/admin-panel/` at `dev` commit `3a8499f`

Audit date: 2026-09-11

This audit applies the contract in `admin-panel-parity-matrix.md`. "Verified" means the active branch contains the implementation and automated evidence. "Superseded" means the Flutter behavior was intentionally excluded by an approved migration decision rather than omitted accidentally.

## Decision

The Next.js admin panel demonstrates the supported Flutter routes and the approved migration corrections for browser-safe sessions, direct-load details, complete filters, vendor and platform commissions, category hierarchy, product moderation, order fulfillment status, finance reporting, banners, and promo codes. Desktop and tablet layout checks pass across the public login, every primary admin route, editors, details, and representative empty states.

No blocking admin parity regression was found. Issues #103 through #121 are closed, and the seeded real-backend workflow provides repeatable mutation, permission, accessibility, and layout evidence. The admin stakeholder approved this go recommendation on 2026-09-12. Issue #121's GitHub Actions billing restriction affects hosted deployment evidence, not the admin feature-parity result.

## Acceptance criteria

| Criterion                                                      | Result   | Evidence or remaining action                                                                                                                                                           |
| -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every parity-matrix row is demonstrated or explicitly deferred | Verified | Route, action, and migration-disposition inventories below. Settings and banner drag-reordering are explicitly superseded.                                                             |
| All high-risk mutations and permission boundaries are verified | Verified | Critical component and BFF tests plus `admin-workflows.spec.ts` cover role denial, confirmations, backend guards, mutation conflicts, authoritative refreshes, and preserved failures. |
| Desktop and tablet layouts are reviewed                        | Verified | `admin-parity-layout.spec.ts` checks 1440x900 and 768x1024 for overflow, clipped controls, shell overlap, navigation drawer behavior, details, editors, and empty states.              |
| Blocking regressions have resolved issues                      | Verified | No blocking parity regression was found; implementation and validation issues #103-#121 are closed.                                                                                    |
| Admin stakeholders approve the result                          | Approved | @ktul15 approved the technical go recommendation on 2026-09-12.                                                                                                                        |

## Route and screen inventory

| Matrix row                       | Result                      | Primary evidence                                                                                                                         |
| -------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Login                            | Verified                    | `admin-auth-panel.test.tsx`, `admin-auth-routes.test.ts`, `admin-workflows.spec.ts`                                                      |
| Session, refresh, and logout     | Verified                    | `proxy.test.ts`, `dashboard-shell-auth.test.tsx`, `admin-auth-routes.test.ts`, `admin-workflows.spec.ts`                                 |
| Responsive admin shell           | Verified for desktop/tablet | `dashboard-responsive.test.ts`, `admin-accessibility.spec.ts`, `admin-parity-layout.spec.ts`                                             |
| Dashboard                        | Verified                    | `dashboard-overview.test.tsx`, `dashboard-data.test.ts`, `dashboard-range.test.ts`, `admin-parity-layout.spec.ts`                        |
| Categories                       | Verified                    | `admin-categories.test.tsx`, `admin-category-routes.test.ts`, `category-data.test.ts`, `admin-workflows.spec.ts`                         |
| Category create/edit/delete      | Verified                    | `admin-categories.test.tsx`, `admin-category-routes.test.ts`, `admin-workflows.spec.ts`                                                  |
| Users and direct-load detail     | Verified                    | `admin-users.test.tsx`, `user-data.test.ts`, `user-list-state.test.ts`, `admin-parity-layout.spec.ts`                                    |
| User ban/unban                   | Verified                    | `admin-user-status-route.test.ts`, `admin-users.test.tsx`, `admin-workflows.spec.ts`                                                     |
| Vendors and direct-load detail   | Verified                    | `admin-vendors.test.tsx`, `vendor-data.test.ts`, `vendor-list-state.test.ts`, `admin-parity-layout.spec.ts`                              |
| Vendor lifecycle                 | Verified                    | `admin-vendor-lifecycle-route.test.ts`, `vendor-lifecycle.test.ts`, `admin-workflows.spec.ts`                                            |
| Vendor commission override       | Verified                    | `admin-commission.test.tsx`, `admin-commission-routes.test.ts`, `commission-data.test.ts`                                                |
| Products and direct-load detail  | Verified                    | `admin-products.test.tsx`, `product-data.test.ts`, `product-list-state.test.ts`, `admin-parity-layout.spec.ts`                           |
| Product activation and deletion  | Verified                    | `admin-product-moderation-route.test.ts`, `admin-products.test.tsx`, `admin-workflows.spec.ts`                                           |
| Orders and direct-load detail    | Verified                    | `admin-orders.test.tsx`, `order-data.test.ts`, `order-list-state.test.ts`, `admin-workflows.spec.ts`, `admin-parity-layout.spec.ts`      |
| Finance revenue and payouts      | Verified                    | `admin-finance.test.tsx`, `finance-data.test.ts`, `finance-state.test.ts`, `revenue-series.test.ts`, `admin-workflows.spec.ts`           |
| Platform commission              | Verified                    | `admin-commission.test.tsx`, `admin-commission-routes.test.ts`, `commission-data.test.ts`                                                |
| Banners list/create/edit/delete  | Verified                    | `admin-banners.test.tsx`, `admin-banner-routes.test.ts`, `banner-data.test.ts`, `admin-workflows.spec.ts`, `admin-parity-layout.spec.ts` |
| Promo list/create/edit/lifecycle | Verified                    | `admin-promos.test.tsx`, `admin-promo-routes.test.ts`, `promo-data.test.ts`, `admin-workflows.spec.ts`, `admin-parity-layout.spec.ts`    |
| Settings                         | Superseded by #114          | The placeholder route and navigation entry are absent; supported commission settings live under Finance and vendor detail.               |

## Action and permission inventory

| Matrix action or boundary                                      | Result     | Evidence or disposition                                                                                                                                      |
| -------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unauthenticated protected-route access                         | Verified   | Server-side session checks and `proxy.test.ts` prevent protected-content flash and preserve safe return paths.                                               |
| Authenticated non-admin denial                                 | Verified   | Auth, proxy, BFF route, backend contract, and Playwright tests exercise 403 handling without rendering admin data.                                           |
| Refresh, invalid refresh, and logout failure                   | Verified   | Shared cookie-session and admin auth tests cover single-flight refresh, retry limits, cookie clearing, and redirect behavior.                                |
| Ban/unban user                                                 | Verified   | Confirmation, ADMIN protection, no-op conflicts, pending state, failure, and authoritative refresh are covered.                                              |
| Approve/reject/suspend vendor                                  | Verified   | Allowed transitions, serialized conflicts, safe response fields, confirmation, failure, and authoritative refresh are covered.                               |
| Change vendor commission                                       | Verified   | Explicit confirmation distinguishes override from platform default and supports `null` restoration.                                                          |
| Activate/deactivate/delete product                             | Verified   | Storefront impact, strong deletion confirmation, order-history conflicts, duplicate prevention, and state refresh are covered.                               |
| Delete category                                                | Verified   | Recursive hierarchy, descendant-cycle prevention, child/product dependency conflicts, confirmation, and managed-media behavior are covered.                  |
| Change platform commission                                     | Verified   | Impact confirmation, 0-100 validation, failure preservation, and refreshed finance data are covered.                                                         |
| Create/edit/activate/deactivate/delete banner                  | Verified   | Multipart validation, progress/retry, preview, confirmation, backend failures, and stable pending state are covered.                                         |
| Banner drag-reordering                                         | Superseded | The Flutter UI never exposed this interaction. The target uses explicit `position` editing; no non-atomic multi-request reorder behavior is carried forward. |
| Create/edit/deactivate/delete promo                            | Verified   | Field rules, URL state, pending state, reversible deactivation, accurate soft-archive wording, confirmation, and errors are covered.                         |
| Read dashboard, details, orders, finance, and payout reporting | Verified   | Generated API contracts, data mappers, component states, direct-load routes, and seeded Playwright evidence cover the supported read paths.                  |

## Required state and migration-gap disposition

Loading, empty and filter-empty, validation, forbidden, retryable error, conflict, mutation-pending, success, and authoritative-refresh behavior is covered by the admin unit/component suite identified in `apps/admin-panel/test/README.md`. The target fixes the matrix's browser-readable tokens, startup protected-content flash, desktop-only shell, cached detail routes, incomplete filters, missing commission controls, ambiguous multi-vendor order status, inaccurate revenue labels, category hierarchy/media behavior, promo archive wording, and image-only banner update contract.

The unsupported Settings placeholder remains removed by decision under #114. Banner drag-reordering is not a parity requirement because no reachable Flutter interaction existed; explicit per-banner position editing is the supported target contract.

## Verification record

| Command or review                                              | Result                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm --filter @repo/admin-panel run test:critical`            | 19 files, 89 tests passed                                                          |
| `pnpm --filter @repo/admin-panel test`                         | 44 files, 149 tests passed                                                         |
| `pnpm --filter @repo/admin-panel lint`                         | Passed                                                                             |
| `pnpm --filter @repo/admin-panel typecheck`                    | Passed                                                                             |
| Seeded admin workflow and accessibility Playwright tests       | 10 tests passed                                                                    |
| `admin-parity-layout.spec.ts` with seeded PostgreSQL and Redis | 3 tests passed at desktop and tablet viewports; guarded seed and cleanup completed |

The checks above ran with Node.js 25.2.1 because the pinned Node.js 24.15 runtime was unavailable locally. The repository's engine constraint remains unchanged, and CI is expected to rerun the same gates on Node.js 24.15.

## Approval record

| Owner             | Status              | Conditions                                          |
| ----------------- | ------------------- | --------------------------------------------------- |
| Admin stakeholder | Approved by @ktul15 | Technical go recommendation approved on 2026-09-12. |
