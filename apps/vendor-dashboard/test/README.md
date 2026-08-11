# Vendor dashboard test strategy

The vendor dashboard keeps business-rule and UI-state coverage below Playwright so failures are fast, deterministic, and attributable. Run commands from the repository root unless noted otherwise.

## Coverage map

| Area                                                              | Primary tests                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Authentication, role denial, session lifecycle, and safe returns  | `vendor-auth-panel.test.tsx`, `vendor-auth-routes.test.ts`, `proxy.test.ts`            |
| Approval variants and route capabilities                          | `vendor-access.test.ts`, `dashboard-shell-auth.test.tsx`, `proxy.test.ts`              |
| Inventory status, pagination, sorting, INR/date formatting        | `product-inventory.test.tsx`, `product-list-state.test.ts`, `product-data.test.ts`     |
| Product forms, variants, dialogs, and recoverable uploads         | `product-form*.test.tsx`, `product-actions.test.tsx`, `product-media-manager.test.tsx` |
| Order tables, details, transitions, tracking, and conflicts       | `vendor-orders.test.tsx`, `order-list-state.test.ts`, `vendor-order-route.test.ts`     |
| Store form validation, media, errors, and read-only states        | `store-profile-form.test.tsx`, `vendor-profile-route.test.ts`                          |
| Dashboard and earnings tables, empty/error states, and formatting | `dashboard-overview.test.tsx`, `earnings-overview.test.tsx`, `sales-series.test.ts`    |
| Same-origin browser API behavior isolated with MSW                | `api-behavior-msw.test.tsx`                                                            |

## Network isolation

`test/msw.ts` owns the shared MSW server. The suite fails on unhandled real requests. Component tests that exercise browser API behavior register per-test handlers with `server.use(...)`, inspect the outgoing request, and return explicit success or failure responses. Route-handler tests may replace `fetch` directly because their subject is the BFF-to-backend transport itself, not browser behavior.

Handlers reset after every test. Tests must not depend on execution order, external services, wall-clock time, random IDs, or data left by another test.

## Required commands

```bash
pnpm --filter @repo/vendor-dashboard run test:critical
pnpm --filter @repo/vendor-dashboard test
```

CI runs the named critical gate before the complete monorepo unit suite. The critical set covers authentication and approval enforcement, ownership-scoped BFF mutations, product form/media recovery, inventory states, order transitions, and store profile mutations. Add any new regression capable of exposing another vendor's data, losing user input, duplicating a mutation, or bypassing authorization to `test:critical`.
