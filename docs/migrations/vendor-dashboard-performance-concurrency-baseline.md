# Vendor Dashboard Performance, Caching, and Concurrency Baseline

Status: **Complete**

Issue: #102

Baseline date: 2026-08-12

## Production build baseline

The baseline was captured with `pnpm --filter @repo/vendor-dashboard test:performance`. Sizes are
raw production assets before transport compression, so the check remains deterministic across local
and CI environments.

| Metric                           | Baseline      | Enforced budget |
| -------------------------------- | ------------- | --------------- |
| Production compilation           | 3.7 seconds   | Informational   |
| TypeScript phase                 | 4.8 seconds   | Informational   |
| Static generation                | 186 ms        | Informational   |
| Largest route client JavaScript  | 525,543 bytes | 850,000 bytes   |
| All emitted client JavaScript    | 1,158,997 B   | 1,250,000 bytes |
| Largest emitted JavaScript chunk | 323,403 bytes | 350,000 bytes   |
| All emitted CSS                  | 37,716 bytes  | 50,000 bytes    |

The bundle check reads every App Router client-reference manifest, resolves unique route chunks,
and fails when any budget is exceeded. The critical routes remain dynamically rendered so inventory,
orders, profile, and vendor status are read from the backend as the authority on navigation or refresh.

## Data freshness and mutation behavior

| Changed data  | Invalidated scopes                   | Cross-tab behavior                     |
| ------------- | ------------------------------------ | -------------------------------------- |
| Product/media | Dashboard and inventory              | Other tabs refresh authoritative data  |
| Order status  | Dashboard and orders                 | Other tabs refresh authoritative data  |
| Store profile | Dashboard and profile                | Other tabs refresh profile/status data |
| Login/logout  | Session plus vendor operational data | Other tabs re-evaluate access          |

TanStack Query keys are centralized by scope. Successful mutations invalidate affected keys before
the current route refreshes, then publish a `BroadcastChannel` event for other tabs. A storage-event
fallback covers browsers without `BroadcastChannel`. Returning to a visible tab after 30 seconds also
invalidates all vendor scopes and refreshes the server-rendered route.

Order progression, product deletion, logout, React Hook Form submissions, and media retries all use
pending-state protection. The destructive and order-status paths additionally use synchronous ref
guards, preventing a second request before React can render the disabled state.

## Large-data behavior

- Inventory and order endpoints are server-paginated and the UI caps each page at 50 rows.
- Wide tables stay inside keyboard-accessible, horizontally contained scroll regions.
- Product media cards use rendering containment; images preserve aspect ratio, decode asynchronously,
  and load lazily with responsive size hints.
- Production bundle budgets prevent unreviewed client-side growth as admin reuse expands.

## Verification record

| Command                                                 | Result                     |
| ------------------------------------------------------- | -------------------------- |
| `pnpm --filter @repo/vendor-dashboard test`             | 30 files, 129 tests passed |
| `pnpm --filter @repo/vendor-dashboard lint`             | Passed                     |
| `pnpm --filter @repo/vendor-dashboard typecheck`        | Passed                     |
| `pnpm --filter @repo/vendor-dashboard test:performance` | Build and budgets passed   |

Unit and component coverage verifies scoped invalidation, cross-tab session/order refresh,
focus-window revalidation, duplicate order submission, product-save recovery, and mutation conflict
handling. The existing responsive browser audit covers critical vendor routes at tablet and desktop
widths.
