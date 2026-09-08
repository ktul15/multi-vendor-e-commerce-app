# Vercel and Railway deployment runbook

Status: issue #121 deployment contract

This runbook deploys the vendor and admin Next.js dashboards to Vercel and the Express API, PostgreSQL, and Redis to Railway. Staging and production are isolated. Provider credentials and generated `.env` files never enter Git.

## Environment topology

| Environment | Source branch | Vendor origin               | Admin origin                | Backend origin            | Data                                    |
| ----------- | ------------- | --------------------------- | --------------------------- | ------------------------- | --------------------------------------- |
| Staging     | `dev`         | Stable Vercel branch domain | Stable Vercel branch domain | Railway staging domain    | Railway staging PostgreSQL and Redis    |
| Production  | `main`        | Vercel production domain    | Vercel production domain    | Railway production domain | Railway production PostgreSQL and Redis |

All six origins must be distinct, exact HTTPS origins without paths, query strings, credentials, or wildcards. Feature branches use Vercel deployment URLs and the staging backend; they never use production data. The dashboards use distinct host-only cookies, so no cookie `Domain` is configured or shared between applications.

## One-time Vercel setup

Create two Vercel projects from this repository:

| Project          | Root directory          | Production branch | Configuration                       |
| ---------------- | ----------------------- | ----------------- | ----------------------------------- |
| Vendor dashboard | `apps/vendor-dashboard` | `main`            | `apps/vendor-dashboard/vercel.json` |
| Admin panel      | `apps/admin-panel`      | `main`            | `apps/admin-panel/vercel.json`      |

Enable access to source files outside each root directory so workspace packages resolve. Assign a stable branch domain to `dev` in each project. Configure the following per target:

| Variable                             | Feature preview                      | `dev` staging                   | Production                         |
| ------------------------------------ | ------------------------------------ | ------------------------------- | ---------------------------------- |
| `API_BASE_URL`                       | Staging backend plus `/api/v1`       | Staging backend plus `/api/v1`  | Production backend plus `/api/v1`  |
| `NEXT_PUBLIC_APP_URL`                | Unset; trusted `VERCEL_URL` fallback | Stable staging dashboard origin | Stable production dashboard origin |
| `DASHBOARD_BFF_SECRET`               | Staging secret                       | Staging secret                  | Production secret                  |
| `DASHBOARD_ENVIRONMENT`              | `preview`                            | `staging`                       | `production`                       |
| `DASHBOARD_RELEASE`                  | Optional; Vercel SHA fallback        | Optional; Vercel SHA fallback   | Optional; Vercel SHA fallback      |
| `DASHBOARD_TRUSTED_CLIENT_IP_HEADER` | `x-vercel-forwarded-for`             | Same                            | Same                               |

Use different random BFF secrets for staging and production, each at least 32 characters. The matching value must be installed on the Railway backend. Mark secrets sensitive. Vercel builds run lint, type-checking, critical tests, and `next build` through each committed `vercel.json`.

## One-time Railway setup

Create one Railway project with isolated `staging` and `production` environments. Each environment contains:

1. `backend`: GitHub source, root directory `/backend`, Dockerfile builder, public HTTPS domain.
2. `Postgres`: Railway PostgreSQL with persistent storage and backups.
3. `Redis`: Railway Redis with persistent storage where session/rate-limit continuity is required.

### Portfolio sandbox on Railway Trial

Railway Trial limits each project to three volumes and reserves managed volume
backups for paid plans. For a temporary portfolio sandbox with no real customer
data, Redis may run without a volume because it is used only as a cache; restarts
will clear rate-limit and cached state. Before accepting real traffic, move to a
plan that supports a persistent Redis volume when continuity is required.

The first empty production-like database may be rehearsed with an explicitly
approved logical `pg_dump`, a recorded SHA-256 checksum, and a successful restore
into an isolated temporary PostgreSQL service. Label its evidence
`sandbox-logical-*` so it cannot be mistaken for a managed backup. This exception
does not provide managed backup or PITR guarantees and is not acceptable once the
environment contains real user, order, or payment data; enable managed backups,
verify PITR, and complete the standard restore drill before that point.

Track `dev` in staging and `main` in production. Configure the backend service in each environment with Railway CLI 5.47.1 or the equivalent reviewed dashboard changes:

```bash
railway environment edit -e staging --service-config backend source.rootDirectory /backend
railway environment edit -e staging --service-config backend deploy.healthcheckPath /api/health/ready
railway environment edit -e staging --service-config backend deploy.healthcheckTimeout 300
railway environment edit -e staging --service-config backend deploy.restartPolicyType ON_FAILURE
railway environment edit -e staging --service-config backend deploy.restartPolicyMaxRetries 10
```

Repeat for `production`. Review staged Railway changes before deploying. The Dockerfile also contains a dependency-aware image health check. Do not add schema migration commands to application startup; use `.github/workflows/database-migrate.yml` before a release that has pending migrations.

## Railway environment variables

Use Railway references for `DATABASE_URL` and `REDIS_URL`; keep both services private. Set `NODE_ENV=production` in staging and production, then distinguish them with `APP_ENVIRONMENT`. `APP_RELEASE` may be omitted because Railway's immutable commit SHA is the fallback.

Required groups:

- Runtime: `NODE_ENV`, `APP_ENVIRONMENT`, `PORT`, `DATABASE_URL`, `REDIS_URL`.
- Authentication: distinct `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and matching environment-specific `DASHBOARD_BFF_SECRET`.
- Exact origins: `STOREFRONT_URL`, `VENDOR_DASHBOARD_URL`, `ADMIN_DASHBOARD_URL`. If no browser storefront is deployed, use the backend's own exact origin for `STOREFRONT_URL`; native apps do not send browser Origin headers.
- Stripe test mode: `STRIPE_SECRET_KEY`, webhook secrets, `STRIPE_CONNECT_RETURN_URL=<vendor-origin>/stripe/return`, and `STRIPE_CONNECT_REFRESH_URL=<vendor-origin>/stripe/refresh`.
- Razorpay test mode: test credentials and webhook secret. `RAZORPAY_SANDBOX_MOCK=true` is permitted only for this portfolio sandbox; never install live credentials alongside the mock.
- Integrations: Cloudinary, SMTP, and Firebase values required by the workflows being demonstrated.

Staging and production must not reuse databases, Redis, JWT secrets, BFF secrets, or webhook secrets. Store only non-secret origins in the corresponding GitHub `staging` and `production` environment variables: `VENDOR_DASHBOARD_ORIGIN`, `ADMIN_DASHBOARD_ORIGIN`, and `BACKEND_ORIGIN`.

## Release procedure

1. Merge a reviewed feature branch into `dev`. Required CI must pass before merge.
2. Confirm Vercel and Railway built the same immutable `dev` SHA for staging. Run the database migration workflow first if that SHA contains migrations.
3. Dispatch **Deployment smoke test** for staging with that SHA. It verifies dashboard identities, backend PostgreSQL/Redis readiness, uncached health responses, and exact credentialed CORS.
4. Exercise login, one read, one safe mutation, uploads, and the sandbox payment/onboarding flows. Record links to logs and test evidence.
5. Merge `dev` into `main` only after staging approval. Confirm required CI and provider builds succeed for the immutable `main` SHA.
6. Apply any production migration through the protected migration workflow, deploy the backend, then the dashboards.
7. Dispatch the production smoke test and record the workflow URL, release SHA, provider deployment IDs, and approver.

Do not promote a commit built with staging variables to production. Build it again under the production target.

## Health and monitoring

- Dashboard liveness: `GET /api/health`; response identifies app, environment, and release and is never cached.
- Backend liveness: `GET /api/health/live` (legacy `/api/health` remains supported).
- Backend readiness: `GET /api/health/ready`; returns 200 only when PostgreSQL and Redis answer, otherwise a detail-free 503.
- Railway's readiness check protects deployment cutover but is not continuous monitoring. Configure an external HTTPS uptime monitor for all dashboard liveness endpoints and backend readiness at intervals of one minute or less for a production system.
- Alert on three consecutive health failures, backend 5xx/error-rate thresholds, database storage/connections, Redis memory/evictions, failed provider deploys, and payment webhook delivery failures. Dashboard structured-event thresholds and owners are defined in `docs/migrations/web-dashboard-observability.md`.

### Portfolio sandbox monitoring

The issue #121 portfolio deployment uses Better Stack's free three-minute HTTP
checks with email alerts. All monitors verify TLS and require a successful 2xx
response:

| Monitor                      | Production endpoint                                               |
| ---------------------------- | ----------------------------------------------------------------- |
| Production backend readiness | `https://backend-production-763a.up.railway.app/api/health/ready` |
| Production admin dashboard   | `https://ktul15-marketplace-admin.vercel.app/api/health`          |
| Production vendor dashboard  | `https://ktul15-marketplace-vendor.vercel.app/api/health`         |

All three monitors reported **Up** during the first-deployment check on
2026-09-08. The three-minute free-tier interval is acceptable only while this is
a no-real-data portfolio sandbox. Before accepting real traffic, use checks at
intervals of one minute or less and add infrastructure, payment-webhook, and
application error-rate alerts.

## Rollback

1. Stop promotion and record the environment, release SHA, first failure, and affected workflows.
2. For a dashboard-only regression, use Vercel Instant Rollback to the last verified deployment for that dashboard, then rerun its health and authentication smoke checks.
3. For a backend regression without a schema change, redeploy the last verified Railway deployment and run the full smoke workflow.
4. If schema changed, follow `docs/operations/database-migration-rollout.md`; Prisma migrations are forward-fix by default. Never restore or reverse production schema casually.
5. Reconcile unknown-outcome financial/order mutations before retrying. Preserve deployment, API, webhook, database, and Redis evidence.
6. Resume only after the last-known-good release passes health, authentication, CORS, and critical workflow checks.

## Incident record

Record detection time, environment, release and deployment IDs, affected origins/routes, customer impact, owner, health/metric evidence, recent config or migration changes, containment, rollback/forward-fix decision, reconciliation results, recovery time, and follow-up issues. Never paste tokens, cookies, connection strings, payment details, or raw user data into the record.

## First-deployment evidence

- Vercel rollback rehearsal: at `2026-09-08T03:48:19Z`, the admin production
  alias was rolled back from healthy deployment
  `dpl_FwfuarrX1UQ6EyRGgKP262fCWSSX` to previously verified deployment
  `dpl_BffC9betaLP8GafWdrnSQMkdeohs`. Both served release
  `659d4cff70bd0255cb1e2d6301e7604b8edee737`; the canonical `/api/health`
  endpoint returned `200`, `environment=production`, and `status=healthy`
  immediately after cutover.

Issue #121 remains open until both environment rows have real provider deployment links, the smoke workflow passes, alerts are active, rollback is rehearsed, and the recorded origins match backend CORS and Stripe return/refresh configuration.
