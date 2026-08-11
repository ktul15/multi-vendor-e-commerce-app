# Vendor Dashboard Flutter-to-Next.js Parity Audit

Status: **Complete — no-go for admin-foundation reuse**

Issue: #100

Audited target: `apps/vendor-dashboard/` at `dev` commit `0b04425`

Audit date: 2026-08-11

This audit applies the contract in `vendor-dashboard-parity-matrix.md`. “Verified” means the active branch has implementation plus automated evidence. “Deferred” identifies the owning follow-up issue. A deferred row is not parity-complete.

## Decision

The active vendor dashboard demonstrates the Flutter routes, migration fixes, backend contracts, and supported desktop/tablet layout for authentication, lifecycle gating, dashboard, inventory, orders, earnings data, payout history, and store profile management. It is not ready for formal parity sign-off because Stripe Connect onboarding and return/refresh handling are absent from the active branch (#97). The real-backend Playwright suite also requires a manual database reseed before repeat runs (#117). The product, order, and payout owner approved this no-go result; that approval accepts the audit findings and does not waive either blocker.

## Acceptance criteria

| Criterion                                                          | Result                    | Evidence or blocker                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every parity-matrix row is demonstrated or explicitly deferred     | Met for audit             | Row inventories below; Stripe start/refresh are deferred to #97.                                                                                                                                                                 |
| Backend request and response behavior matches production contracts | Verified                  | `npm run api:check`; vendor BFF route tests; seeded real-backend Playwright run.                                                                                                                                                 |
| Known regressions have blocking issues                             | Verified                  | #97 owns missing Connect onboarding; #117 owns deterministic E2E seed/cleanup. The #101 accessibility review is complete with no remaining accessibility no-go finding.                                                          |
| Desktop and tablet layouts are reviewed                            | Verified for parity scope | `vendor-parity-layout.spec.ts` checks public auth, lifecycle gates, critical/detail routes, and empty/error states at 1440×900 and 768×1024. It detects document overflow, clipped controls, shell overlap, and drawer failures. |
| Product, order, and payout owners approve the result               | Approved (no-go)          | @ktul15 approved the audit findings on 2026-08-11; #97 and #117 remain mandatory before admin-foundation reuse.                                                                                                                  |

## Route and screen inventory

| Matrix row         | Result                             | Primary evidence                                                                                                                |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Login              | Verified                           | `vendor-auth-panel.test.tsx`, `vendor-auth-routes.test.ts`, `dashboard-smoke.spec.ts`                                           |
| Registration       | Verified                           | `vendor-auth-panel.test.tsx`, `vendor-auth-routes.test.ts`, `vendor-workflows.spec.ts`                                          |
| Session/logout     | Verified                           | `proxy.test.ts`, `dashboard-shell-auth.test.tsx`, `vendor-workflows.spec.ts`                                                    |
| Responsive shell   | Verified for desktop/tablet parity | `dashboard-shell.test.tsx`, `vendor-parity-layout.spec.ts`, and `vendor-dashboard-accessibility-audit.md`                       |
| Approval gate      | Verified                           | `vendor-access.test.ts`, `dashboard-shell-auth.test.tsx`, `proxy.test.ts`, `vendor-workflows.spec.ts`                           |
| Dashboard          | Verified                           | `dashboard-overview.test.tsx`, `dashboard-data.test.ts`, `vendor-parity-layout.spec.ts`                                         |
| Product list       | Verified                           | `product-inventory.test.tsx`, `product-list-state.test.ts`, `vendor-workflows.spec.ts`                                          |
| Product create     | Verified                           | `product-form.test.tsx`, `product-media-manager.test.tsx`, `vendor-workflows.spec.ts`                                           |
| Product edit       | Verified                           | `product-form.test.tsx`, `vendor-product-routes.test.ts`, `vendor-workflows.spec.ts`                                            |
| Product delete     | Verified                           | `product-actions.test.tsx`, `vendor-product-routes.test.ts`, `vendor-workflows.spec.ts`                                         |
| Orders             | Verified                           | `vendor-orders.test.tsx`, `order-list-state.test.ts`, `vendor-workflows.spec.ts`                                                |
| Order progression  | Verified                           | `vendor-orders.test.tsx`, `vendor-order-route.test.ts`, `vendor-workflows.spec.ts`                                              |
| Earnings analytics | Verified                           | `earnings-overview.test.tsx`, `earnings-data.test.ts`, `vendor-workflows.spec.ts`                                               |
| Store profile      | Verified                           | `store-profile-form.test.tsx`, `vendor-profile-route.test.ts`, `vendor-workflows.spec.ts`                                       |
| Stripe Connect     | **Deferred / blocking**            | Status is displayed, but onboarding start and return/refresh routes are absent; #97 owns completion and test-mode verification. |
| Earnings ledger    | Verified                           | `earnings-overview.test.tsx`, `earnings-data.test.ts`, `vendor-workflows.spec.ts`                                               |
| Payout history     | Verified                           | `earnings-overview.test.tsx`, `earnings-data.test.ts`, `vendor-workflows.spec.ts`                                               |

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
| Start/refresh Connect onboarding                                      | **Deferred / blocking**        | No active web routes or controls; #97.                                                                                                                     |
| Read Connect status                                                   | Verified                       | Earnings data/component tests and Playwright exercise status display.                                                                                      |
| List earnings, earnings summary, list payouts                         | Verified                       | Earnings data/component tests cover pagination, status buckets, partial failures, empty states, and currency; Playwright covers reachability.              |

## Required state and migration-gap disposition

Authentication validation, lifecycle states (`PENDING`, `REJECTED`, `SUSPENDED`, `APPROVED`), loading, empty, validation, forbidden, network-error, mutation-pending, success, and preserved-failure states are covered by the vendor unit/component suite identified in `apps/vendor-dashboard/test/README.md`. The active implementation fixes the matrix’s inventory identity, inactive products, category editing, media/tags, atomic product/variant editing, order pagination and `REFUNDED` filtering, independent dashboard/earnings panels, store media, cookie sessions, centralized profile access, and direct-load order detail gaps.

Two gaps remain blocking:

1. Stripe Connect onboarding, return reconciliation, refresh-loop protection, state explanations, and test-mode evidence remain #97.
2. The Playwright workflows mutate shared seeded records and fixed registration identities. A clean seed passes, but a repeat run without reseeding fails. Deterministic per-run setup and cleanup remain #117.

Layout-stable loading states remain covered at component level by the vendor suite and shared UI tests. The broader automated accessibility, focus-order, contrast, keyboard, and responsive review passed under #101; its findings and evidence are recorded in `vendor-dashboard-accessibility-audit.md`.

## Verification record

| Command                                                  | Result                                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @repo/vendor-dashboard run test:critical` | 11 files, 55 tests passed                                                                                             |
| `pnpm --filter @repo/vendor-dashboard test`              | 28 files, 120 tests passed                                                                                            |
| `pnpm --filter @repo/vendor-dashboard lint`              | Passed                                                                                                                |
| `pnpm --filter @repo/vendor-dashboard typecheck`         | Passed                                                                                                                |
| `pnpm --filter @repo/vendor-dashboard build`             | Passed                                                                                                                |
| `npm run api:check`                                      | OpenAPI and generated client checks passed                                                                            |
| Seeded `playwright test --project vendor-chromium`       | 10 tests passed after a clean QA seed, including 4 desktop/tablet layout tests; repeatability remains blocked by #117 |

## Approval record

| Owner   | Status                    | Conditions                                                 |
| ------- | ------------------------- | ---------------------------------------------------------- |
| Product | Approved no-go by @ktul15 | Re-review after #97 and #117.                              |
| Orders  | Approved no-go by @ktul15 | Rerun deterministic order progression evidence after #117. |
| Payouts | Approved no-go by @ktul15 | Complete and verify Stripe onboarding under #97.           |

This completed audit is a no-go decision, not cutover or admin-foundation approval.
