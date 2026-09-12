# Internal Dashboard Migration Acceptance Report

Status: **No-go - staging deployment and manual sign-off pending**

Issue: #123

Acceptance date: 2026-09-12

Candidate source: `feature/123-dashboard-acceptance-testing`, based on `dev` commit `a3a60c3096cc3e6bd2e95eebd2676ff3cdf17ccc`

## Decision

The final local candidate passes dashboard, backend, seeded browser automation, accessibility, performance, build, API-contract, source-map, and production dependency checks. Acceptance is not complete because the canonical staging dashboards still serve commit `3a8499fbea14dcea809f4f238f307b1914b78624`, while the staging backend serves `a3a60c3096cc3e6bd2e95eebd2676ff3cdf17ccc`. Vercel's `git-dev` previews serve `a3a60c3`, but those preview origins correctly fail the backend's exact CORS allowlist. The patched candidate must be committed and deployed as one immutable release on the canonical staging origins before staging smoke and manual exploratory sign-off can occur.

## Acceptance criteria

| Criterion                                                                  | Status         | Evidence or remaining action                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor and admin parity checklists complete                                | Pass           | Admin and vendor technical go recommendations were approved by @ktul15 on 2026-09-12; neither checklist has a blocked row.                                                                                             |
| Seeded E2E and manual exploratory testing pass                             | Pending manual | Guarded E2E passes 16 vendor and 14 admin tests with isolated PostgreSQL/Redis reset and cleanup. In-app browser discovery returned no available browser session, so manual testing was not claimed.                   |
| Authentication, uploads, Stripe redirects, and critical mutations verified | Pass locally   | Unit/component/backend suites and seeded Playwright cover role denial, session/logout, upload security, Stripe status/onboarding redirect, products, orders, moderation, commissions, categories, promos, and banners. |
| Performance, accessibility, and security blockers closed                   | Pass locally   | Automated WCAG suites pass; bundle budgets pass; dashboard production audit is clean; the backend Node 24.15 production image reports zero vulnerabilities.                                                            |
| Signed release candidate recorded                                          | Pending        | Record the committed SHA, matching staging release IDs, approvers, and timestamp after deployment and manual acceptance.                                                                                               |

## Automated evidence

| Gate                                               | Result                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Workspace format, lint, typecheck, test, API drift | Passed; 31 vendor files/142 tests and 44 admin files/149 tests                                             |
| Backend lint, build, and isolated test suite       | Passed; 43 suites/535 tests                                                                                |
| Seeded Playwright                                  | Passed; vendor 16 and admin 14 applicable tests                                                            |
| Production dashboard build                         | Passed for vendor and admin on Next.js 16.3.3                                                              |
| Vendor bundle budget                               | 38,058 B CSS; 323,401 B largest JS chunk; 485,561 B largest route; 1,108,501 B total JS, all within budget |
| Deployable source maps                             | None found                                                                                                 |
| Dashboard production audit                         | No known vulnerabilities                                                                                   |
| Backend production image                           | Node 24.15 build passed; 237 runtime packages; zero vulnerabilities; Prisma CLI/MySQL tooling absent       |

The local machine used Node.js 25.2.1 for workspace and backend host checks because the pinned Node.js 24.15 runtime was unavailable. The production backend Docker build used the repository-pinned Node.js 24.15.0 image.

## Security remediation

Acceptance testing found newly published critical/high advisories after the issue #118 review. The candidate updates Next.js and its shared config to 16.3.3, pins Sharp 0.35.4, updates Multer 2.3.0 and Nodemailer 9.1.1, and applies patched Express/Swagger transitive versions. Firebase Admin 14.4.0 required migration to its modular app/messaging APIs. The backend production install now omits optional tooling peers, preventing the Prisma CLI and its unused MySQL dependencies from entering the runtime image.

## Manual staging checklist

Run against one committed SHA reported by all three `/api/health` endpoints.

- [ ] Vendor: login/logout, wrong-role denial, lifecycle gates, dashboard, product create/edit/media/delete, order progression/tracking, store profile, earnings/payouts, Stripe onboarding top-level redirect, and return/refresh states.
- [ ] Admin: login/logout, wrong-role denial, user/vendor/product moderation, commission changes, category create/delete conflict, order/finance views, banner upload/delete failure, and promo lifecycle.
- [ ] Both: direct-load/refresh, expired session, transient backend error/retry, keyboard navigation, desktop/tablet layout, and no protected-content flash.
- [ ] Operations: matching release IDs, health/readiness, exact CORS, telemetry correlation, and rollback to the prior immutable dashboard build without database restoration.

## Remaining sign-off

1. Commit and deploy this candidate to both staging dashboards and the staging backend under one SHA.
2. Run deployment smoke plus the manual checklist and record defects or Pass results.
3. Record QA, backend, web engineering, security, operations, product, and migration-owner approvals with timestamp and candidate SHA.
