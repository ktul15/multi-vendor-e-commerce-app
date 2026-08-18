# Web dashboard observability and diagnostics

Implemented for issue #120 on 2026-08-18. The vendor and admin dashboards emit provider-neutral structured error events to server stderr so the deployment platform can collect, search, retain, and alert on them without a browser monitoring credential.

## Runtime contract

Set these server-side values for every deployment:

- `DASHBOARD_ENVIRONMENT`: stable environment name such as `staging` or `production`.
- `DASHBOARD_RELEASE`: immutable build identifier, preferably the deployed commit SHA. Vercel and GitHub commit variables are used as fallbacks; `local` is the final fallback.

Every event is a single JSON object with `event: "dashboard.error"`, timestamp, dashboard app, environment, release, runtime, category, operation, route pattern, severity, optional HTTP status, optional request ID, and a sanitized error name/message/digest. Categories are `auth`, `api`, `upload`, `mutation`, and `render`.

Client instrumentation observes same-origin `/api/*` failures, adds `X-Dashboard-Request-ID`, and reports errors to the same-origin `/api/telemetry` route. It also captures uncaught browser errors, unhandled promise rejections, and React error-boundary failures. Next.js `onRequestError` captures uncaught server render, route-handler, action, and proxy failures.

## Data handling

Telemetry never reads or sends request/response bodies, cookies, authorization headers, form fields, stacks, user IDs, or query strings. Dynamic UUID/numeric route segments are normalized. Error text is length-bounded and redacts authorization, cookie, password, secret, token, API-key, card/CVC, email, bearer-token, JWT, and payment-number patterns. The ingestion route requires the exact configured origin and rejects malformed or payloads larger than 16 KiB.

If sensitive data is ever observed, restrict access to the affected log stream, notify the security owner, delete/export according to the incident policy, and add a regression test before restoring normal retention.

## Source-map policy

Both dashboards explicitly disable production browser and server source maps. `.map` files must not be served publicly or retained in public deployment artifacts. CI runs `pnpm run source-maps:check` against both deployable `.next/server` and `.next/static` trees after every production build. Diagnostics use release identifiers, route patterns, error digests, and reproducible local builds.

If a hosted monitoring provider is adopted later, its CI integration must upload maps privately under `DASHBOARD_RELEASE`, restrict download access to the web-operations team, remove maps from deployable artifacts after upload, define retention, and prove with an HTTP check that production `.map` URLs return 404 before enabling browser maps.

## Alert ownership

| Signal | Primary owner | Escalation |
| --- | --- | --- |
| Client/server render failures or cross-dashboard regressions | Web engineering | Release owner |
| Authentication failures with status 5xx or sustained 429 spikes | Backend/auth | Security for suspicious traffic |
| API and mutation status 5xx | Owning backend feature team | Web engineering if isolated to one dashboard release |
| Upload failures | Catalog/media backend | Infrastructure for storage/provider failures |
| Payment-adjacent mutation failures | Payments/backend | Finance operations and incident commander |

Page the primary owner for any production render-error burst, any payment-adjacent 5xx, or a five-minute 5xx rate above 2% for a category/route. Create a normal-priority investigation for repeated warnings below those thresholds. Staging events route to web engineering without paging.

## Triage

1. Filter `event=dashboard.error` by environment, app, release, category, and route.
2. Compare the affected release with the last healthy release and deployment time.
3. Group by status, operation, error name/digest, and request ID; never paste raw production logs into tickets.
4. Check dashboard edge logs and the backend health/provider logs for the same time window.
5. Reproduce with the immutable release and sanitized route. Roll back if failures are release-correlated and user-impacting.
6. Assign the owning team above, record impact and mitigation, and add a regression test before closure.

Production telemetry access is limited to operations, security, and owning engineers. Retain production error events for 30 days and staging events for 7 days unless incident or legal policy requires a narrower or explicitly approved hold.
