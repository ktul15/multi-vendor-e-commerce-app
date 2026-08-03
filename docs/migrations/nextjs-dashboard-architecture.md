# Next.js Dashboard Architecture and Engineering Conventions

Status: Architecture decision record for issue #75

Applies to: `apps/vendor-dashboard`, `apps/admin-panel`, and shared web packages

Baseline verified: 2026-08-01 at commit `8d5c4e8023d5714a3284a15e9febc7986154ff63`

## Purpose

This document defines the architecture both Next.js dashboards must follow. It is intentionally prescriptive: feature issues should implement these decisions instead of creating app-specific alternatives. Exceptions require a documented reason, tests, and review.

## Decision summary

- Use a pnpm workspace with Turborepo and two independent Next.js App Router applications.
- Default to React Server Components. Add client boundaries only for interaction, browser APIs, or client-owned server state.
- Treat authenticated operational data as dynamic and user-scoped; never put it in a shared public cache.
- Use the generated API package as the only ordinary backend transport layer.
- Use TanStack Query for interactive server state, React Hook Form plus shared Zod schemas for forms, and TanStack Table for server-backed tables.
- Use Tailwind CSS for styling, shadcn-style source-owned primitives in `@repo/ui`, Lucide for icons, and Recharts for standard dashboard charts.
- Keep authentication enforcement in the backend and a server-aware web session boundary; client guards are presentation only.
- Deploy vendor and admin dashboards independently from one repository and promote immutable builds through environments.

## Target workspace

```text
apps/
  admin-panel/
    app/
    src/features/
    src/lib/
    tests/
  vendor-dashboard/
    app/
    src/features/
    src/lib/
    tests/
packages/
  api-client/
  auth/
  config/
  schemas/
  test-utils/
  ui/
tooling/
  eslint/
  typescript/
  vitest/
```

Issue #77 creates this structure. Existing `backend/`, `storefront/`, `vendor_dashboard/`, and `admin_panel/` commands and dependency trees remain independent.

### Package ownership

| Package/application | Owns | Must not own |
|---|---|---|
| `apps/vendor-dashboard` | Vendor routes, feature composition, vendor navigation, copy, feature-specific query options and views | Reusable primitives, handwritten backend DTOs, admin features |
| `apps/admin-panel` | Admin routes, feature composition, admin navigation, copy, feature-specific query options and views | Reusable primitives, handwritten backend DTOs, vendor features |
| `packages/api-client` | Generated endpoint types/client, envelope normalization, cancellation, multipart transport, typed API errors | React components, feature policy, token persistence |
| `packages/auth` | Server session helpers, role requirements, safe return paths, logout/session APIs, shared auth types | Backend authorization decisions, feature UI |
| `packages/schemas` | Shared form/search-parameter schemas and API-field-error mapping helpers | Backend DTO copies already generated in `api-client` |
| `packages/ui` | Accessible tokens and presentation primitives without business rules | API calls, role checks, feature-specific wording |
| `packages/config` | Environment-schema helpers and shared browser-safe constants | App-specific environment schemas, secrets, or build-tool configuration |
| `packages/test-utils` | Test renderers, MSW factories, fixtures/builders, accessibility helpers | Production runtime behavior |
| `tooling/*` | Shared lint, TypeScript, formatting, and test configuration | Application source |

Shared packages expose explicit public entry points. Applications never import another application's source, package internals, generated build output, or files through relative paths that cross workspace boundaries.

Each application owns its concrete server/client environment schema and uses helpers from `@repo/config`. `tooling/*` owns ESLint, TypeScript, Prettier, Vitest, and other build-tool configuration; it does not parse runtime environment variables.

### Workspace task contract

- The root `package.json` pins pnpm through its `packageManager` field, and the pnpm lockfile is committed. CI uses Corepack and `pnpm install --frozen-lockfile`.
- Canonical workspace scripts are `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `format`, and `format:check`. Packages implement only applicable tasks; root scripts orchestrate them through Turbo.
- `build` depends on `^build`. Type-check and lint tasks may depend on generated API/schema outputs but not application builds unless required by the tool.
- Cache deterministic `build`, `lint`, `typecheck`, `test`, and `format:check` outputs with explicit output paths. Never cache secrets, `.env*`, runtime logs, coverage unless declared, or framework caches that contain environment-specific data.
- `dev`, `test:e2e`, deployments, contract tests that mutate shared services, and other environment-sensitive tasks are persistent/non-cacheable as appropriate.
- Turbo task inputs include source, relevant configuration, the lockfile, and declared environment-variable names. CI and local task names remain identical.

## Naming and imports

- Directories and non-component files use `kebab-case`; React component files use `kebab-case.tsx` with `PascalCase` exports.
- Hooks begin with `use`; query option factories end in `QueryOptions`; mutation option factories end in `MutationOptions`.
- Zod values end in `Schema`; inferred types use the domain name without an `I` prefix.
- Test files use `*.test.ts(x)`; Playwright files use `*.spec.ts`.
- Prefer named exports. App Router special files keep required default exports.
- Use `@/` only for application-local `src` imports and `@repo/<package>` for workspace packages.
- Feature modules may import shared packages and their own files. Cross-feature imports go through the owning feature's public `index.ts`, not deep paths.
- TypeScript is strict. Avoid `any`, non-null assertions, and unchecked casts at API or URL boundaries.

## App Router and route organization

Each app uses the App Router. Route groups express layout/security concerns without changing public URLs:

```text
app/
  (public)/login/page.tsx
  (protected)/layout.tsx
  (protected)/page.tsx
  (protected)/products/page.tsx
  (protected)/products/[id]/page.tsx
  (protected)/products/[id]/edit/page.tsx
  forbidden/page.tsx
  error.tsx
  global-error.tsx
  loading.tsx
  not-found.tsx
```

- `page.tsx` composes feature modules; it does not contain a large business implementation.
- Protected layout performs the server-side session/role check before rendering the shell.
- Use nested `loading.tsx`, `error.tsx`, and `not-found.tsx` at meaningful recovery boundaries.
- Dynamic detail routes fetch their own resource and never depend on prior list navigation or client cache presence.
- Search, filter, sort, page, and page-size state belongs in validated URL search parameters when it changes the server result or should survive navigation.
- Route handlers exist only for a browser boundary that cannot safely call the backend directly, such as cookie session orchestration. They are not a second business API.
- Prefer `<Link>` for navigation. Use imperative routing only after an action or when navigation is conditional.

## Server and client component boundaries

Server Components are the default. They may:

- verify session and role;
- read validated route/search parameters;
- fetch or prefetch initial backend data with server credentials;
- compose layouts, headings, static metadata, and non-interactive content;
- pass serializable props or dehydrated query state into narrow client islands.

A component uses `"use client"` only when it needs state/effects, event handlers, browser APIs, React context, TanStack Query hooks, React Hook Form, TanStack Table, interactive charts, file selection, or client-side dialogs. The directive belongs at the smallest stable boundary; it must not be added to an entire route merely because one child is interactive.

Server-only modules import `server-only`. Client modules must never import cookie access, private environment variables, server API helpers, or server-only packages.

## Rendering and data ownership

| Data/use case | Rendering owner | Client ownership |
|---|---|---|
| Session and role | Protected server layout | Auth provider may expose a minimal serializable session summary for UI only |
| Initial list/detail data | Server Component prefetch when it improves first render | TanStack Query hydrates and owns subsequent refresh/mutations |
| Frequently changing operational panels | Streamed/prefetched server query or direct client query | TanStack Query owns refetch and partial failure |
| Form draft and dialog state | None | Local state/React Hook Form |
| Table pagination/filter/sort | Server validates URL | Client controls UI and writes canonical URL |
| Design/reference data | Server prefetch where helpful | Query cache with an explicit longer stale time |
| Secrets and refresh credentials | Server/backend only | Never serialized or persisted in browser storage |

Do not fetch the same resource independently in both a Server Component and a client hook without hydration or an explicit reason. TanStack Query hydration is preferred over passing `initialData` because it retains query timestamps and ownership semantics.

## Caching policy

Authenticated dashboard data is dynamic by default:

- Backend requests containing a user session use `cache: "no-store"` unless a reviewed user-scoped caching design exists.
- Do not use shared Next.js data cache entries for user, vendor, admin, order, earnings, payout, or moderation data.
- Static assets, build-time navigation configuration, and public design/reference content may use framework caching.
- Category/reference queries may use a longer TanStack Query `staleTime`, but cache keys must still include every contract-relevant scope.
- Query defaults use finite stale times, bounded retries, refetch-on-focus only where operationally useful, and no persistence of protected query caches.
- Retry safe reads for transient failures only. Mutations are not automatically retried unless the operation is idempotent and explicitly reviewed.
- After a mutation, invalidate the smallest authoritative key set. Do not clear the entire cache to hide missing ownership.
- Logout clears all in-memory protected queries before navigation.

Query keys are defined by feature factories, for example `vendorProductKeys.list(params)` and `adminOrderKeys.detail(id)`. Keys include normalized page, filters, sort, date range, and identity scope where identity is not already isolated by cache lifetime.

## API client and errors

- #81 generates or checks endpoint types against the corrected OpenAPI contract from #74/#130.
- Feature code calls typed operations from `@repo/api-client`; it does not call raw `fetch`/Axios for ordinary API traffic.
- The client normalizes success envelopes, 204 responses, both current pagination families, validation errors, general errors, cancellation, and multipart requests.
- A typed `ApiError` preserves HTTP status, safe message, field errors, request correlation metadata when available, and retryability. It never exposes raw response internals to UI.
- Both server and browser transports accept an optional `AbortSignal`. Callers propagate it where TanStack Query or a framework API provides one; Server Components are not assumed to expose a universal request-lifecycle signal.
- Generated types preserve monetary wire representations exactly: Prisma Decimal-derived major-unit amounts remain decimal strings, while Stripe minor-unit inputs remain contract-defined integers. Do not coerce either with implicit `Number(...)` conversion.
- `@repo/schemas` defines normalized money as `{ currency: "INR"; unit: "major" | "minor"; amount: string }`, where `amount` is a canonical decimal or integer string. Boundary parsers validate scale/unit and create this value; arithmetic uses an approved arbitrary-precision decimal utility, never binary floating point.
- Shared money formatters accept only normalized money, convert minor-to-major explicitly, and use `Intl.NumberFormat` only after a precision-safe conversion/formatting step. Stripe adapters alone convert validated minor-unit integers to the SDK's required safe integer representation.
- Dates cross the API as ISO 8601 strings and are parsed/formatted at feature boundaries. Date-only filters must not drift because of local timezone conversion.

## TanStack Query conventions

- Create one stable `QueryClient` per mounted browser application and one isolated `QueryClient` per server request/prefetch scope. Clear and recreate the browser client on logout or identity change; never persist it across users.
- Query definitions use reusable `queryOptions` factories shared by prefetch and hooks.
- Server prefetch uses `dehydrate` plus `HydrationBoundary` only for queries needed on first render.
- Parallel dashboard panels use independent query/error boundaries so one failed panel does not erase successful siblings.
- Keep previous data visible during pagination/period changes when it does not misrepresent the selected state.
- Mutations disable duplicate submission, surface field/general errors, and invalidate authoritative queries after success.
- Optimistic updates are limited to easily reversible, low-risk operations. Financial, destructive, approval, moderation, inventory, and order-state mutations refresh from the server.
- Query data is server state, not copied into a global client store.

## Forms and validation

- React Hook Form owns form state; Zod schemas from `@repo/schemas` validate browser inputs.
- Client validation mirrors confirmed API contracts but never replaces backend validation.
- Convert empty optional inputs deliberately to omission or `null`; never rely on incidental empty strings.
- Shared helpers map API `errors[].field` paths onto form fields and retain the API message as a form-level fallback.
- Preserve user input after recoverable failures. Focus the first invalid field and provide an accessible error summary for long forms.
- Submit only meaningful changes for update forms. Disable no-op submissions where the backend rejects or currently mishandles them.
- Destructive and high-impact actions use a dedicated confirmation pattern outside ordinary edit forms.
- Server Actions may orchestrate cookie/session boundaries, but ordinary feature forms use the typed API client plus mutations so error behavior is consistent.

## Tables, filters, and charts

- TanStack Table is headless; `@repo/ui` owns accessible markup and styles.
- Operational lists use manual server-side pagination, sorting, and filtering. The URL is the canonical controlled state.
- Translate between one-based API pages and zero-based table state in one adapter.
- Validate URL parameters on the server, apply documented defaults, and replace invalid values with a canonical URL.
- Debounce text search before URL replacement; filter changes reset the page.
- Row identity uses stable backend IDs. Row actions expose explicit pending state and do not shift layout.
- Empty dataset and filter-empty states are distinct. Preserve table headers while loading subsequent pages.
- Recharts is the standard chart library. Shared chart frames, tooltips, legends, axes, colors, loading/empty/error states, and accessibility fallbacks live in `@repo/ui`; feature modules own only domain series mapping and labels.
- A feature-specific visualization dependency requires an architecture note showing that Recharts cannot meet the requirement, bundle-impact review, and reuse plan. Apps may not independently add general-purpose chart libraries.
- Charts receive normalized domain data and accessible text/table summaries. Avoid encoding meaning by color alone.
- Heavy chart code may be dynamically imported inside a client boundary, with a layout-stable loading state.

## Uploads

- File selection and preview live in a client component; upload transport comes from `@repo/api-client`.
- Validate accepted MIME type, 5 MB per-file limit, route field count, and image count before upload, while treating backend validation as authoritative.
- Previews use object URLs and revoke them on replacement/unmount.
- Show progress when supported, allow cancellation, prevent duplicate submit, and preserve non-file fields after failure.
- Never treat a local preview or Cloudinary URL as proof that the owning DB mutation succeeded.
- Cleanup and rollback semantics follow #131, #133, and #135. UI reports the primary mutation result and records cleanup warnings only when the contract exposes them safely.
- Stripe Connect onboarding is an external top-level navigation, not a file upload or embedded trusted page.

## Authentication and authorization

The target session work is implemented by #82–#84:

### Selected topology: same-origin dashboard BFF

```text
Browser
  │ same-origin HTTPS + dashboard-host cookies + CSRF header
  ▼
Next.js dashboard route handlers / Server Components
  │ server-to-server HTTPS + forwarded backend session credentials
  ▼
Express API
```

- Each dashboard is a Backend-for-Frontend boundary on its own hostname. Browser dashboard API traffic uses same-origin `/api/*` route handlers; browsers do not call the Express origin directly for authenticated dashboard features.
- Login is submitted to the dashboard BFF. The BFF calls the backend web-login contract and relays the rotated session as host-only, HttpOnly cookies scoped to that dashboard host. Vendor and admin cookies use distinct names and are never shared through a parent-domain cookie.
- Server Components and protected layouts receive those host-scoped cookies with the incoming request. The server transport converts/forwards them only to the configured Express origin; credentials are never serialized into RSC props or client JavaScript.
- `@repo/api-client` exposes two adapters over the same generated operations: a server transport that accepts explicit request-scoped credentials and a browser transport that calls the same-origin BFF with `credentials: "same-origin"`. Feature code does not manually forward cookies.
- Refresh is owned by the BFF and coordinated by a non-secret opaque session identifier across all deployed dashboard instances. #82/#84 must implement either a shared lock plus short-lived shared result or backend rotation idempotency/grace; an in-process promise map alone is insufficient. Coordination has bounded timeouts/cleanup, never keys by a raw token, rewrites both host-scoped cookies, and retries the original request once. Route handlers must not recursively proxy refresh failures.
- Logout goes through the BFF, asks the backend to revoke/blacklist the refresh credential, clears both dashboard-host cookies even if revocation fails, clears protected client queries, and redirects.
- The BFF issues a readable, non-secret CSRF token bound to the session. Client mutations echo it in a custom header; the BFF verifies token/header plus `Origin`/`Sec-Fetch-Site` before forwarding. Login, refresh, and logout receive explicit CSRF/login-CSRF treatment under #83.
- BFF-to-Express calls are server-to-server and are not protected or authenticated by CORS or an `Origin` header. They forward request-scoped session credentials; Express enforces authentication, role, vendor approval, and resource ownership. Deployment may additionally restrict network/service identity, but never substitutes that for application authorization. Existing bearer-token Flutter traffic remains compatible and does not pass through this BFF.
- Cookie attributes are host-only, `HttpOnly`, `Secure` in production, `Path=/`, and an explicitly tested SameSite policy (default `Lax` unless a flow proves `Strict` viable). The CSRF cookie/token is readable by design but carries no authentication credential.

1. Backend remains compatible with bearer-token Flutter clients while supporting browser-safe HttpOnly cookies.
2. Backend/BFF contracts support rotation while the BFF owns dashboard-host cookie issuance and clearing.
3. Dashboard browser mutations are same-origin to their BFF and require its CSRF/origin checks. Backend credentialed CORS allowlists apply only to explicitly supported direct browser clients, such as the storefront compatibility path; vendor/admin dashboard origins are configured for redirect/CSRF validation, not as authorization for BFF-to-Express traffic. #83 documents and tests each origin by purpose, including rejected direct-browser origins and rejected dashboard CSRF requests.

   The #83 backend baseline uses the exact `STOREFRONT_URL`,
   `VENDOR_DASHBOARD_URL`, and `ADMIN_DASHBOARD_URL` origins; arbitrary localhost
   ports and wildcard origins are rejected. Direct browser cookie sessions use a
   double-submit `__Secure-csrf_token`/`X-CSRF-Token` contract plus Fetch Metadata
   rejection for cross-site mutations. The API exposes the rotated non-secret
   token header only through credentialed responses to an allowed origin, and the
   shared client retains it for cross-host API deployments. Native Flutter bearer
   traffic and server-to-server calls without authentication cookies remain
   outside CSRF enforcement; CORS never replaces backend authentication,
   authorization, approval, or ownership checks.

4. Protected layouts verify the session and required role server-side before rendering protected content.
5. Vendor layouts also load the vendor profile and apply PENDING/REJECTED/SUSPENDED/APPROVED capability gates.
6. A wrong-role identity goes to an access-denied route; a missing/expired unrecoverable session goes to login with a validated relative return path.
7. Refresh is single-flight across deployed instances for the same opaque session identifier. A request retries at most once after successful refresh; concurrency tests send overlapping expired-session requests through different instances and verify one rotation outcome without false logout.
8. Logout follows the BFF flow above, clears protected query data, and redirects to the public home/login policy defined by the app.

Never place refresh tokens in `localStorage`, session storage, browser-readable cookies, URLs, logs, analytics, or hydrated props. Never use middleware-only checks as the sole authorization boundary; backend role, approval, and ownership checks are mandatory.

## UI and accessibility

- #79 owns tokens and primitives; #80 owns the responsive shell.
- Tailwind CSS is the styling system. Shared tokens are CSS custom properties consumed through Tailwind; applications may compose utilities but may not fork token values or introduce a second CSS-in-JS/design-system runtime.
- shadcn/ui is used as a source pattern, not a runtime component dependency. Approved primitive source is copied and adapted once into `packages/ui`, reviewed for accessibility, exported through public entry points, and customized there. Apps do not run the shadcn generator into application folders.
- Lucide React is the standard icon set. Product/category imagery and brand artwork are assets, not substitutes from another icon library.
- Recharts is the default visualization library as defined above.
- Desktop uses a sidebar; tablet uses a drawer/header pattern. Features must not depend on fixed viewport widths.
- Use semantic HTML first. All controls are keyboard operable, have visible focus, and expose accessible names.
- Dialog focus is trapped and restored. Toasts do not carry information that is unavailable elsewhere.
- Status badges combine text/icon with color. Loading skeletons preserve layout and respect reduced motion.
- Every route supports loading, empty, filter-empty, validation, forbidden, not-found, conflict, transient error, pending, and success states applicable to it.

## Testing conventions

| Layer | Tools | Required coverage |
|---|---|---|
| Schema/unit | Vitest | URL parsers, Zod transformations, query keys, formatters, permission helpers |
| Component | Vitest + Testing Library | User-observable behavior, keyboard/focus, loading/error/empty/success, form field errors |
| API interaction | MSW | Typed success/error envelopes, pagination variants, 204, 401/403/404/409, upload failures |
| End-to-end | Playwright | Login/session/role gates, critical vendor/admin workflows, direct URLs, responsive layouts |
| Backend contract | Jest/Supertest | Cookie auth, permissions, validation, response/OpenAPI corrections, uploads, redirects |

- Tests use role-based accessible queries and avoid implementation-detail selectors.
- Shared deterministic builders live in `@repo/test-utils`; do not share mutable fixture objects between tests.
- MSW handlers model the audited runtime contract and are updated with generated client changes.
- Each fixed defect gets a regression test at the lowest layer that proves the behavior.
- CI in #78 runs format check, lint, type-check, unit/component tests, contract drift checks, and production builds. Playwright smoke tests gate deployment; broader suites run according to #98/#99/#115/#116.

## Environment and deployment

- Each app has its own validated server environment schema and checked-in `.env.example`; no real secrets are committed.
- Only variables intentionally exposed to the browser use the public prefix. API secrets, cookie keys, and internal origins remain server-only.
- Vendor and admin apps build and deploy independently, with separate hostnames, environment variables, observability, and rollback controls.
- CI builds from the repository root through Turborepo using a frozen lockfile. Cache only reproducible outputs; never cache secrets or environment-specific runtime artifacts.
- Build once per commit and promote the immutable artifact through staging/production where the platform permits.
- Database migrations remain a backend deployment concern and must be backward compatible during dashboard rollout.
- Health/readiness checks, source maps, error reporting, and release identifiers follow #120/#121.
- Rollout, rollback, coexistence with Flutter dashboards, and parity sign-off follow #76.

## Enforcement and downstream ownership

| Decision area | Implementation issue |
|---|---|
| Workspace and package skeleton | #77 |
| Strict TypeScript, lint, formatting, CI | #78 |
| Tokens and UI primitives | #79 |
| Responsive shell | #80 |
| Generated API client | #81 and #130 |
| Cookie authentication | #82 |
| CORS, CSRF, headers | #83 |
| Session/role guards | #84 |
| Query/forms/tables/test harness | #85 |
| Migration rollout and rollback | #76 |

## Architecture sign-off checklist

- [ ] Both apps use App Router and the documented protected/public route groups.
- [ ] Server/client boundaries follow the default-server rule and no secret enters a client bundle.
- [ ] Authenticated data is not stored in a shared public framework cache.
- [ ] All ordinary backend traffic uses the generated typed API client.
- [ ] Query, form, URL/table, chart, upload, and error patterns match this document.
- [ ] Server session and backend authorization checks prevent protected-content flashes and cross-role access.
- [ ] Workspace dependency rules and package public entry points are enforced.
- [ ] Required unit, component, API interaction, contract, and end-to-end checks pass.
- [ ] Each app builds, deploys, observes, and rolls back independently.

## Official references

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js caching guidance](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [pnpm workspaces](https://pnpm.io/workspaces)
- [Turborepo task configuration](https://turborepo.com/docs/crafting-your-repository/configuring-tasks)
- [TanStack Query with Server Components](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Table pagination](https://tanstack.com/table/latest/docs/guide/pagination)
- [TanStack Table controlled state](https://tanstack.com/table/latest/docs/framework/react/guide/table-state)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zod](https://zod.dev/)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Lucide](https://lucide.dev/guide/packages/lucide-react)
- [Recharts](https://recharts.github.io/en-US/guide/)
- [Vitest](https://vitest.dev/guide/)
- [Mock Service Worker](https://mswjs.io/docs/)
- [Playwright](https://playwright.dev/docs/intro)
