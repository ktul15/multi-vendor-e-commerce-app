# Admin panel test strategy

The admin panel keeps business rules and UI-state coverage below Playwright so failures remain fast, deterministic, and attributable. Run commands from the repository root unless noted otherwise.

## Coverage map

| Area                                                                                   | Primary tests                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Authentication, admin-only permissions, session lifecycle, and safe returns            | `admin-auth-panel.test.tsx`, `admin-auth-routes.test.ts`, `proxy.test.ts`                         |
| User permissions, account statuses, dialogs, tables, and conflicts                     | `admin-users.test.tsx`, `admin-user-status-route.test.ts`, `user-list-state.test.ts`              |
| Vendor lifecycle, commission inheritance, dialogs, and stale transitions               | `admin-vendors.test.tsx`, `admin-vendor-lifecycle-route.test.ts`, `vendor-lifecycle.test.ts`      |
| Product moderation, tables, details, and destructive-action errors                     | `admin-products.test.tsx`, `admin-product-moderation-route.test.ts`, `product-list-state.test.ts` |
| Category hierarchy, forms, image uploads, dependency errors, and keyboard access       | `admin-categories.test.tsx`, `admin-category-routes.test.ts`, `category-data.test.ts`             |
| Platform and vendor commissions, validation, confirmation, and failures                | `admin-commission.test.tsx`, `admin-commission-routes.test.ts`, `commission-data.test.ts`         |
| Banner forms, upload progress/retry, previews, dialogs, and errors                     | `admin-banners.test.tsx`, `admin-banner-routes.test.ts`, `banner-data.test.ts`                    |
| Promo forms, tables, lifecycle rules, dialogs, and server errors                       | `admin-promos.test.tsx`, `admin-promo-routes.test.ts`, `promo-data.test.ts`                       |
| Orders and finance totals, tables, filters, formatting, and partial/empty/error states | `admin-orders.test.tsx`, `admin-finance.test.tsx`, `dashboard-overview.test.tsx`                  |
| Same-origin browser API behavior isolated with MSW                                     | `api-behavior-msw.test.tsx`                                                                       |

The seeded Playwright suite adds cross-layer evidence. `admin-workflows.spec.ts` covers role denial and high-risk mutations against the real backend, `admin-accessibility.spec.ts` covers critical WCAG and keyboard behavior, and `admin-parity-layout.spec.ts` checks every primary route plus representative details, editors, and empty states at 1440x900 and 768x1024.

## Network isolation

`test/msw.ts` owns the shared MSW server, and the suite fails on any unhandled request. Component tests covering browser API behavior register per-test handlers with `server.use(...)`, inspect the outgoing request, and return explicit success or failure responses. Route-handler tests may replace `fetch` directly because their subject is the BFF-to-backend transport rather than browser behavior.

Handlers reset after every test. Tests must not depend on execution order, external services, wall-clock time, random IDs, or data left by another test.

## Required commands

```bash
pnpm --filter @repo/admin-panel run test:critical
pnpm --filter @repo/admin-panel test
```

CI runs the named critical gate before the complete monorepo unit suite. Add any regression capable of bypassing admin authorization, changing an invalid lifecycle state, losing form or upload data, duplicating a mutation, or misreporting financial values to `test:critical`.
