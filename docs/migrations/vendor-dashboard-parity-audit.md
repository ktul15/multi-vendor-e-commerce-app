# Vendor Dashboard Flutter-to-Next.js Parity Audit

Status: **Complete - go recommendation approved**

Issue: #100

Audited target: `apps/vendor-dashboard/` at `dev` commit `a3a60c3`

Audit date: 2026-09-12

This audit applies the contract in `vendor-dashboard-parity-matrix.md`. “Verified” means the active branch has implementation plus automated evidence. “Deferred” identifies the owning follow-up issue. A deferred row is not parity-complete.

## Decision

The active vendor dashboard demonstrates the supported Flutter routes, migration fixes, backend contracts, and desktop/tablet layouts for authentication, lifecycle gating, dashboard, inventory, orders, earnings, payouts, store profile management, and Stripe Connect onboarding. Issue #97 delivered onboarding plus return/refresh reconciliation, and issue #123 revalidated those paths with deterministic real-backend Playwright coverage. No blocking vendor parity regression remains. The product, order, and payout stakeholder approved this updated go recommendation on 2026-09-12.

## Acceptance criteria

| Criterion                                                          | Result                    | Evidence or blocker                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every parity-matrix row is demonstrated or explicitly deferred     | Verified                  | Every supported route and action, including Stripe Connect start/return/refresh, has implementation and automated evidence.                                                                                                      |
| Backend request and response behavior matches production contracts | Verified                  | `npm run api:check`; vendor BFF route tests; seeded real-backend Playwright run.                                                                                                                                                 |
| Known regressions have blocking issues                             | Verified                  | #97 and #117 are complete; #101 and #118 record no unresolved critical/high accessibility or runtime-security finding.                                                                                                           |
| Desktop and tablet layouts are reviewed                            | Verified for parity scope | `vendor-parity-layout.spec.ts` checks public auth, lifecycle gates, critical/detail routes, and empty/error states at 1440×900 and 768×1024. It detects document overflow, clipped controls, shell overlap, and drawer failures. |
| Product, order, and payout owners approve the result               | Approved                  | @ktul15 approved the updated technical go recommendation on 2026-09-12.                                                                                                                                                          |

## Route and screen inventory

| Matrix row         | Result                             | Primary evidence                                                                                          |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Login              | Verified                           | `vendor-auth-panel.test.tsx`, `vendor-auth-routes.test.ts`, `dashboard-smoke.spec.ts`                     |
| Registration       | Verified                           | `vendor-auth-panel.test.tsx`, `vendor-auth-routes.test.ts`, `vendor-workflows.spec.ts`                    |
| Session/logout     | Verified                           | `proxy.test.ts`, `dashboard-shell-auth.test.tsx`, `vendor-workflows.spec.ts`                              |
| Responsive shell   | Verified for desktop/tablet parity | `dashboard-shell.test.tsx`, `vendor-parity-layout.spec.ts`, and `vendor-dashboard-accessibility-audit.md` |
| Approval gate      | Verified                           | `vendor-access.test.ts`, `dashboard-shell-auth.test.tsx`, `proxy.test.ts`, `vendor-workflows.spec.ts`     |
| Dashboard          | Verified                           | `dashboard-overview.test.tsx`, `dashboard-data.test.ts`, `vendor-parity-layout.spec.ts`                   |
| Product list       | Verified                           | `product-inventory.test.tsx`, `product-list-state.test.ts`, `vendor-workflows.spec.ts`                    |
| Product create     | Verified                           | `product-form.test.tsx`, `product-media-manager.test.tsx`, `vendor-workflows.spec.ts`                     |
| Product edit       | Verified                           | `product-form.test.tsx`, `vendor-product-routes.test.ts`, `vendor-workflows.spec.ts`                      |
| Product delete     | Verified                           | `product-actions.test.tsx`, `vendor-product-routes.test.ts`, `vendor-workflows.spec.ts`                   |
| Orders             | Verified                           | `vendor-orders.test.tsx`, `order-list-state.test.ts`, `vendor-workflows.spec.ts`                          |
| Order progression  | Verified                           | `vendor-orders.test.tsx`, `vendor-order-route.test.ts`, `vendor-workflows.spec.ts`                        |
| Earnings analytics | Verified                           | `earnings-overview.test.tsx`, `earnings-data.test.ts`, `vendor-workflows.spec.ts`                         |
| Store profile      | Verified                           | `store-profile-form.test.tsx`, `vendor-profile-route.test.ts`, `vendor-workflows.spec.ts`                 |
| Stripe Connect     | Verified                           | `connect-onboarding-routes.test.ts`, `earnings-overview.test.tsx`, `vendor-workflows.spec.ts`             |
| Earnings ledger    | Verified                           | `earnings-overview.test.tsx`, `earnings-data.test.ts`, `vendor-workflows.spec.ts`                         |
| Payout history     | Verified                           | `earnings-overview.test.tsx`, `earnings-data.test.ts`, `vendor-workflows.spec.ts`                         |

## Action and API inventory

| Matrix actions                                                        | Result                         | Evidence or disposition                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in, apply as vendor, restore identity, refresh session, sign out | Verified                       | Auth route, proxy, shell, MSW, and Playwright tests exercise browser-safe sessions and role denial.                                                        |
| Read/edit vendor profile                                              | Verified                       | Profile route and form tests cover permissions, JSON/multipart updates, media, validation, and preserved errors.                                           |
| Dashboard totals, sales series, top products                          | Verified                       | Generated client calls and dashboard/earnings tests cover response mapping, INR formatting, empty data, and independent failures.                          |
| List/read/advance vendor orders                                       | Verified                       | Order route/component tests and Playwright cover ownership-scoped detail, all filters, forward-only progression, conflicts, and tracking.                  |
| Read category tree and list vendor inventory                          | Verified                       | Category selector and inventory tests cover nested selection, inactive inventory, URL filters, sorting, and pagination.                                    |
| Create/update/delete product                                          | Verified                       | Product form/route/action tests and Playwright cover validation, ownership, confirmation, 409 history conflicts, and atomic editor updates.                |
| Upload/replace/remove product media                                   | Verified                       | Media manager and route tests cover limits, stable IDs, order, recovery, and accessible controls.                                                          |
| Add/update/delete variant                                             | Verified through atomic editor | The active web editor uses `PUT /products/{id}/editor`, which supersedes the unsafe sequential mutation flow while preserving variant rules and conflicts. |
| Start/refresh Connect onboarding                                      | Verified                       | BFF route tests cover trusted provider URLs and return/refresh reconciliation; Playwright verifies top-level trusted navigation.                           |
| Read Connect status                                                   | Verified                       | Earnings data/component tests and Playwright exercise status display.                                                                                      |
| List earnings, earnings summary, list payouts                         | Verified                       | Earnings data/component tests cover pagination, status buckets, partial failures, empty states, and currency; Playwright covers reachability.              |

## Required state and migration-gap disposition

Authentication validation, lifecycle states (`PENDING`, `REJECTED`, `SUSPENDED`, `APPROVED`), loading, empty, validation, forbidden, network-error, mutation-pending, success, and preserved-failure states are covered by the vendor unit/component suite identified in `apps/vendor-dashboard/test/README.md`. The active implementation fixes the matrix’s inventory identity, inactive products, category editing, media/tags, atomic product/variant editing, order pagination and `REFUNDED` filtering, independent dashboard/earnings panels, store media, cookie sessions, centralized profile access, and direct-load order detail gaps.

No parity gap remains blocking. Stripe Connect onboarding, return reconciliation, refresh-loop protection, and state explanations were delivered by #97. The guarded #117 data workflow resets PostgreSQL and Redis before each dashboard project and performs foreign-key-safe cleanup after the run.

Layout-stable loading states remain covered at component level by the vendor suite and shared UI tests. The broader automated accessibility, focus-order, contrast, keyboard, and responsive review passed under #101; its findings and evidence are recorded in `vendor-dashboard-accessibility-audit.md`.

## Verification record

| Command                                                  | Result                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @repo/vendor-dashboard run test:critical` | 12 files, 66 tests passed                                                                                                                                   |
| `pnpm --filter @repo/vendor-dashboard test`              | 31 files, 142 tests passed                                                                                                                                  |
| `pnpm --filter @repo/vendor-dashboard lint`              | Passed                                                                                                                                                      |
| `pnpm --filter @repo/vendor-dashboard typecheck`         | Passed                                                                                                                                                      |
| `pnpm --filter @repo/vendor-dashboard build`             | Passed                                                                                                                                                      |
| `npm run api:check`                                      | OpenAPI and generated client checks passed                                                                                                                  |
| Canonical `pnpm run test:e2e` vendor project             | 16 tests passed after an isolated PostgreSQL/Redis reset, including accessibility, desktop/tablet layouts, critical mutations, and Stripe redirect coverage |

## Approval record

| Owner   | Status              | Conditions                                                  |
| ------- | ------------------- | ----------------------------------------------------------- |
| Product | Approved by @ktul15 | Updated technical go recommendation approved on 2026-09-12. |
| Orders  | Approved by @ktul15 | Current seeded order workflow evidence passes.              |
| Payouts | Approved by @ktul15 | Stripe onboarding, earnings, and payout evidence passes.    |

This audit recommends go for vendor feature parity. It is not a staging acceptance or cutover approval; issue #123 owns those remaining gates.
