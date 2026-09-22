# Internal Dashboard Migration Acceptance Report

Status: **No-go - staging admin rate-limit defect and manual sign-off pending**

Issue: #123

Acceptance date: 2026-09-22

Candidate source: `feature/123-dashboard-acceptance-testing` at `939054740a4ae7adef94aec69aa588206c03bd11`

## Decision

The local automated gates pass, and the canonical staging backend, admin dashboard, and vendor dashboard now report the same candidate SHA. Controlled customer, administrator, and vendor accounts were created successfully, and deployed-browser checks passed for vendor registration plus approved, rejected, and suspended access gates. Acceptance remains a no-go because ordinary admin navigation exhausted the per-session global limit: Redis recorded 113 requests against the 100-request/15-minute limit, backend profile checks returned HTTP 429, and `/vendors` rendered the dashboard error boundary. The remaining manual checklist and cross-functional sign-offs must wait for that defect to be resolved and the corrected candidate to be redeployed.

## Acceptance criteria

| Criterion                                                                  | Status       | Evidence or remaining action                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor and admin parity checklists complete                                | Pass         | Admin and vendor technical go recommendations were approved by @ktul15 on 2026-09-12; neither checklist has a blocked row.                                                                                             |
| Seeded E2E and manual exploratory testing pass                             | Blocked      | Guarded E2E passes 16 vendor and 14 admin tests. Staging browser smoke exposed the admin per-session 429 failure, so the full exploratory checklist and sign-off remain pending.                                       |
| Authentication, uploads, Stripe redirects, and critical mutations verified | Pass locally | Unit/component/backend suites and seeded Playwright cover role denial, session/logout, upload security, Stripe status/onboarding redirect, products, orders, moderation, commissions, categories, promos, and banners. |
| Performance, accessibility, and security blockers closed                   | Pass locally | Automated WCAG suites pass; bundle budgets pass; dashboard production audit is clean; the backend Node 24.15 production image reports zero vulnerabilities.                                                            |
| Signed release candidate recorded                                          | Pending      | Candidate `9390547` is deployed consistently; record the corrected SHA and approvers after the rate-limit defect and full manual acceptance are complete.                                                              |

## Staging execution evidence

Executed 2026-09-22 against candidate `939054740a4ae7adef94aec69aa588206c03bd11`:

- Backend deployment `e24457d6-3bcc-4fcf-a12a-c66e7ca1abca`, admin deployment `dpl_BGZktB4TdTxZrKBXZc2wravbcKE9`, and vendor deployment `dpl_45eiZ7TkSaNKRV1QDDXFCh7uDicQ` report the same staging release; backend database and Redis readiness passed.
- The guarded bootstrap created `admin.staging@example.com`; backend and deployed admin login checks confirmed a verified `ADMIN`. The temporary Railway password and confirmation variables were removed, followed by a clean redeploy.
- One customer registered through the public API. Three vendors registered through the deployed vendor UI and reached the pending-review gate.
- Deployed admin UI actions approved, rejected, and approved-then-suspended separate vendors. Vendor UI logins then showed the expected approved dashboard, rejected gate, and suspended gate.
- Blocker: one admin browser session reached Redis key count 113 for a limit of 100. `/api/v1/auth/profile` returned HTTP 429 and `/vendors` displayed `Something went wrong`. A fresh session completed the remaining isolated action, but that does not clear the normal-navigation defect.

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

1. Fix the admin dashboard request amplification or adjust the correctly scoped per-session rate-limit design, then rerun all affected automated checks.
2. Deploy the corrected candidate to both staging dashboards and the staging backend under one SHA.
3. Rerun deployment smoke and the complete manual checklist, recording defects or Pass results.
4. Record QA, backend, web engineering, security, operations, product, and migration-owner approvals with timestamp and candidate SHA.
