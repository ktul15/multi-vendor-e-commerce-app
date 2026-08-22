# Web Dashboard Rollout, Rollback, and Parity Sign-off

Status: Migration runbook for issue #76

Applies to: Flutter vendor/admin dashboards, Next.js vendor/admin dashboards, and their shared backend

Baseline verified: 2026-08-01 at commit `1a96326318022de59764fbd7f5e0f1c8d7872a2b`

## Purpose

This runbook defines how the Next.js dashboards coexist with Flutter, earn parity approval, roll out safely, roll back without data loss, and eventually replace the legacy dashboard applications. A feature being implemented is not sufficient for cutover; every stage requires recorded evidence and explicit approval.

## Scope and principles

- Vendor and admin dashboards roll out independently. A failure or delay in one does not force cutover of the other.
- Flutter and Next.js use the same backend and database during coexistence. There is no application-level dual write or data copy between dashboards.
- The backend remains the authorization and business-rule boundary for both clients.
- Backend changes are backward compatible throughout the coexistence window. New response fields are additive; removals or semantic changes require versioning or a compatibility adapter.
- Rollback means routing users back to the proven Flutter dashboard while retaining all authoritative backend data created through Next.js.
- Each build is identified by commit/release ID. Rollout percentages and approvals refer to immutable deployed artifacts.
- Security, payment, payout, authorization, destructive-action, and data-integrity failures override schedule pressure.

## Roles and accountability

One person may hold multiple roles in a small team, but every sign-off records the individual, timestamp, build ID, environment, and evidence links.

| Role | Accountable for | Required approvals |
|---|---|---|
| Migration owner | Overall sequence, issue dependencies, stage entry/exit, final recommendation | Every stage transition |
| Vendor product owner | Vendor workflow correctness and accepted intentional differences | Vendor parity and vendor cutover |
| Admin product owner | Admin workflow correctness and accepted intentional differences | Admin parity and admin cutover |
| Backend/API owner | Compatibility, migrations, contracts, authorization, rollback-safe data | Staging onward |
| Web engineering owner | Build integrity, feature flags/routing, client telemetry, rollback execution | Limited rollout onward |
| QA owner | Test plans, deterministic data, regression evidence, parity reports | Staging, limited rollout, cutover |
| Security reviewer | Auth, role/ownership, CSRF/CORS, secrets, uploads, dependency findings | Limited rollout and cutover |
| Operations/on-call owner | Dashboards, alerts, incident response, capacity, deployment/rollback readiness | Limited rollout and cutover |

No author self-approves the only evidence for a critical security, payment/payout, or destructive workflow.

## Source-of-truth checklists

| Area | Contract/checklist | Implementation/validation owner |
|---|---|---|
| Vendor behavior | `vendor-dashboard-parity-matrix.md` | #86–#100 |
| Admin behavior | `admin-panel-parity-matrix.md` | #103–#116 and #122 |
| API behavior | `dashboard-api-contract-audit.md` | #129–#135, #81, #130 |
| Architecture | `nextjs-dashboard-architecture.md` | #77–#85 |
| Accessibility | WCAG-oriented component/E2E evidence | #101 and #119 |
| Security | Threat review and adversarial tests | #118 |
| Test data | Deterministic seed/reset and account matrix | #117 |
| Observability | Logs, metrics, traces, alerts, release IDs | #120 |
| Deployment | Staging/production builds, routing, rollback | #121 |

Every parity row is marked one of:

- **Pass** — verified in the target environment with linked evidence.
- **Accepted difference** — product owner documents why the new behavior intentionally differs and why it is safe.
- **Deferred** — an unimplemented non-critical row has a linked implementation issue, risk statement, owner, target release/date, workaround, and product-owner approval. Deferral is eligible for a limited cohort only when QA, security, operations, and migration owners agree it does not block that cohort.
- **Blocked** — unmet dependency or defect; cannot be treated as parity.
- **Not applicable** — feature explicitly excluded by the parity contract, with rationale.

Critical login/session, role/ownership, security, data-integrity, payment/payout, order-state, inventory correctness, destructive action, and rollback workflows cannot be Deferred. General production cutover requires every Deferred row either completed or explicitly accepted as a product-scope removal and reclassified as Accepted difference/Not applicable in the source parity contract. Issues #100 and #122 report Deferred rows separately and never count them as demonstrated parity.

## Environments and traffic controls

| Environment | Purpose | Data | Access |
|---|---|---|---|
| Local/CI | Fast automated validation | Isolated disposable test data | Engineers/CI |
| Staging | Production-like integration, UAT, load and rollback rehearsal | Dedicated non-production database and Stripe test mode | Team and invited testers |
| Production shadow | Deploy production configuration without general navigation | Production backend, read/write only for approved internal test accounts | Internal allowlist |
| Production limited | Real users selected by stable cohort | Production | Allowlist/percentage cohort with immediate opt-out |
| Production general | Default Next.js experience | Production | All eligible users; Flutter fallback retained during soak |

Routing is server-controlled and auditable. Cohorts use stable non-sensitive identifiers, role, and explicit allowlists—not random choice on every request. Separate flags control vendor and admin traffic. A global kill switch routes all traffic for one dashboard back to Flutter without deploying code.

Direct legacy URLs remain available to authorized users during coexistence. Redirects preserve only validated relative return paths and never carry tokens.

### Routing control contract

- #121 owns a highly available authoritative flag store and server-side evaluator. Flag changes require migration/operations RBAC, reason, actor, timestamp, old/new value, expiry where applicable, and immutable audit history.
- Evaluation precedence is: emergency kill switch, denylist/forced Flutter, explicit Next.js allowlist, deterministic percentage cohort, default Flutter. Higher-precedence rules always win.
- Percentage assignment hashes a stable non-secret user/profile identifier plus dashboard-specific rollout salt into fixed buckets. Changing the percentage never reshuffles existing buckets; salts are versioned and audited.
- Evaluators refresh within 60 seconds. The emergency kill switch has a target propagation of 60 seconds and is tested across all instances. Store timeout/invalid configuration fails closed to Flutter for new navigations; an already active Next.js page enters read-only incident mode for high-impact mutations until routing/session state is reconciled.
- A versioned route map defines every Next.js route's Flutter fallback and query translation. Unknown routes fall back to the dashboard landing page, not a redirect chain. A hop marker and maximum one cross-dashboard redirect prevent loops.
- Moving to Flutter does not transfer BFF cookies into browser-readable bearer credentials. The fallback opens Flutter's normal login/session restoration flow with a validated relative destination; users may need to authenticate again. Returning to Next.js likewise uses the BFF session flow.
- User opt-out writes a forced-Flutter rule with an owner/expiry and takes effect by the propagation target. It is not a client-only preference.
- #121 tests precedence, deterministic cohorts, propagation/failure behavior, auditing, every route mapping, loop prevention, and session-safe fallback. #82–#84 test the authentication transitions.

## Rollout stages

### Stage 0 — Foundation and contract readiness

Entry:

- Issues #72–#76 are approved.

Entry approver: migration owner.

Required exit evidence:

- #77–#85 foundation and auth work passes CI.
- The current repository workflows cover backend CI and backend image publication only; they do **not** satisfy any web rollout gate. Production shadow is prohibited until #78/#121 add and demonstrate web install, lint, type-check, unit/component, Playwright smoke, production build, artifact publication, deployment, routing, and rollback jobs for both apps.
- Required backend contract issues for the next feature slice are merged and documented.
- Generated client drift check passes against corrected OpenAPI.
- Both dashboard production builds can be created independently.
- Feature flags, release identifiers, and rollback route are implemented but not enabled.
- No browser-readable refresh credential exists in the Next.js apps.

Exit approvers: migration, backend, web engineering, and security owners.

### Stage 1 — Staging implementation and parity

Vendor entry requires its #86–#99 feature/test work. Admin entry requires #103–#116. Both use the deterministic data workflow delivered by #117.

Entry approvers: migration, relevant product, QA, backend, and web engineering owners.

Required exit evidence per dashboard:

- Vendor validation issues #100–#102 or admin parity issue #122 are complete as applicable; cross-dashboard security/accessibility requirements #118/#119 are complete before production shadow.
- Every applicable parity row has Pass, Accepted difference, or a Deferred entry satisfying the controlled criteria above. The Stage 1 evidence bundle includes the Deferred register.
- Unit/component, backend contract, and Playwright suites pass on the release candidate.
- Direct URLs, refresh/logout, wrong-role, expired-session, offline/transient error, and responsive layouts pass.
- Destructive, approval, order-state, commission, upload, Stripe Connect, earnings/payout, and moderation flows applicable to the dashboard pass.
- Accessibility and security findings have no unresolved critical/high issues; lower issues have owners and accepted deadlines.
- Production-like build, environment validation, health checks, source maps, and release telemetry pass.
- Restore/rollback rehearsal is completed without database restoration.

Exit approvers: relevant product owner, QA, backend, security, operations, and migration owner.

### Stage 2 — Production shadow/internal allowlist

Deploy the immutable release with general routing disabled. Allow only named internal vendor/admin accounts.

Minimum observation: two business days and at least one complete critical workflow cycle; extend if traffic is insufficient.

Required exit evidence:

- No cross-role/cross-vendor data exposure.
- No unexpected schema, payment, payout, inventory, order, or moderation mutation.
- Authentication success, API error rate, route error rate, latency, and client exceptions remain within the baseline/thresholds below.
- Operators can identify release, cohort, user role, request correlation ID, and backend failure without logging secrets.
- Kill switch and prior-build redeploy are exercised in production configuration.
- Every Deferred row is re-reviewed against production data/risk and reapproved for the named internal cohort by its owner, relevant product owner, QA, security, operations, and migration owner.

Entry approvers: relevant product owner, QA, backend, web engineering, security, operations, and migration owner. The full go/no-go record is mandatory before the first production account is enabled.

Exit approvers: relevant product owner, QA, backend, web engineering, security, operations, and migration owner.

### Stage 3 — Limited production rollout

Vendor rollout cohorts: opt-in pilot vendors, then 5%, 25%, 50%. Admin rollout cohorts: named admins, then all admins because the population is small; do not use meaningless percentage sampling.

Hold each cohort for at least one business day and enough representative actions. High-impact workflows require explicit observed samples; elapsed time alone is insufficient.

Advance only when:

- All rollback thresholds remain clear.
- Support feedback is triaged and no critical workflow regression is open.
- Parity delta report contains no new Blocked item.
- The Deferred register has no expired item; every remaining row is reapproved for this exact cohort with current evidence, owner, risk, workaround, and target date.
- Database/API compatibility is confirmed for users moving between Flutter and Next.js.
- Operations and the relevant product owner approve the next cohort.

Entry approvers: relevant product owner, QA, backend, web engineering, security, operations, and migration owner. Web engineering also confirms the release/routing controls as required evidence. Each cohort increase records a focused go/no-go addendum with current metrics, incidents, parity delta, and all entry approvers.

Exit approvers: relevant product owner, QA, backend, web engineering, security, operations, and migration owner.

### Stage 4 — Production cutover

Next.js becomes the default route for the approved dashboard. Flutter remains reachable by kill switch/direct fallback during the soak period.

Stage 4 entry requires zero Deferred parity rows. Each prior Deferred item must be completed or formally reclassified as an Accepted difference/Not applicable in the source parity contract under the rules above.

Minimum soak before disabling ordinary Flutter access: 14 consecutive days, including representative order/payment/payout and admin moderation activity.

Cutover does not equal archive. During soak:

- Continue error, latency, auth, business-event, and support monitoring.
- Run scheduled parity smoke tests against the current production release.
- Keep the Flutter build deployable and compatible.
- Restrict Flutter changes to critical security, data-loss, and shared-backend compatibility fixes.

Entry approvers: the full go/no-go checklist requires QA, backend, web engineering, security, operations, relevant product, and migration-owner approval. The migration owner records the final cutover time and release.

Exit/soak approvers: relevant product owner, QA, backend, web engineering, security, operations, and migration owner approve disabling ordinary Flutter access after the soak evidence passes.

### Stage 5 — Flutter freeze, retirement, and archive

Freeze criteria per dashboard:

- Stage 4 is stable and product owner declares Next.js the system of interaction.
- All non-emergency feature work targets Next.js only.
- A code-owner/branch rule prevents accidental Flutter feature changes.
- Support and operational documentation points to Next.js.

Retirement criteria:

- At least 30 consecutive stable days after general cutover.
- No rollback to Flutter during the final 14 days.
- During the final 14 days, no rollback threshold is breached, critical workflow success remains at or above the approved cutover baseline, and no severity-1/2 dashboard incident remains open.
- No open critical/high parity, accessibility, security, data-integrity, or operational defect.
- For 30 days, legacy-route telemetry shows zero non-test usage except documented emergency/support access; every observed user/account is investigated and either migrated or explicitly owned before retirement.
- Backend compatibility removal plan is separately reviewed; no endpoint is removed merely because UI traffic is low.
- Final Flutter release/build instructions and dependencies are reproducible.
- A restore rehearsal within the preceding seven days proves the tagged Flutter build can be deployed, authenticated, and complete its critical smoke workflows against the compatible backend.

Archive actions:

1. Tag the last supported Flutter dashboard commit and retain build artifacts/checksums, dependency lockfiles, signing/rebuild instructions, evidence, and release notes for at least 12 months after retirement or longer when security/audit policy requires.
2. Add an archive README with replacement URL, retirement date, owner, build instructions, known limitations, and restore procedure.
3. Remove public navigation/routing only after the separate kill-switch retirement approval below.
4. Make the legacy directory read-only by process first; physical repository removal requires a separate issue and retention approval.
5. Retain test evidence, release notes, incident history, and data/API compatibility decisions.

Entry approvers: relevant product owner, QA, backend, web engineering, security, operations, and migration owner. Retirement and later kill-switch removal are separate decisions and require the same recorded approvers.

Kill-switch retirement occurs no earlier than 90 days after Flutter retirement, after another 30-day zero-use telemetry window and a successful restore rehearsal. The relevant product, QA, backend, web engineering, security, operations, and migration owners must unanimously approve it. Until then, the fallback artifact, route map, credentials/configuration, and operator procedure remain tested monthly.

## Data and API compatibility

### Coexistence rules

- Both clients read/write the same authoritative backend; neither caches an offline source of truth.
- Database migrations use expand-and-contract: add nullable/defaulted structures first, deploy compatible readers/writers, backfill safely, then remove old structures only after Flutter retirement.
- Enum additions must not crash old Flutter deserializers. Before adding a value, either update/release Flutter or keep the value behind an endpoint/version compatibility layer.
- Existing fields are not renamed, removed, narrowed, or semantically repurposed during coexistence.
- Pagination and error-shape corrections preserve the old contract or use versioned/new endpoints until old clients retire.
- Money currency/unit and decimal-string versus minor-unit representations remain explicit; clients never infer or silently convert wire units.
- Upload replacement and cleanup failures cannot leave DB references pointing to unavailable assets.
- Stripe webhook processing, order/payment state, earnings, and payouts remain backend-owned and idempotent regardless of initiating dashboard.
- Every mutation is classified in the generated client as **idempotent** (safe repeated PUT/PATCH only where backend semantics prove it), **idempotency-key protected** (backend persists/replays one result for a scoped key), or **non-retryable**. The BFF never automatically retries the non-retryable class, and UI duplicate-submit prevention is not treated as idempotency.
- Network loss after a non-retryable or unknown-outcome mutation triggers an authoritative lookup/reconciliation flow before the user may retry. Financial, order creation/status, payout, destructive, upload, and inventory mutations require explicit classification and tests. Backend idempotency/reconciliation work is tracked by #136.

### Production database migration gates

The executable controls, evidence fields, and operator sequence are defined in [`../operations/database-migration-rollout.md`](../operations/database-migration-rollout.md); this rollout document supplies the dashboard retirement and compatibility approvals consumed by that runbook.

- Database migration is a separately authorized deployment step owned by the backend/API owner and observed by operations; application startup must not be the uncontrolled production migration coordinator.
- Before the first production migration, operations verifies automated backups/PITR coverage, retention, recovery point/objective, and a successful restore drill in an isolated environment using a recent representative backup.
- Only one migration runner executes against an environment. It records migration ID, release, start/end, result, and lock/concurrency evidence before application instances roll.
- Schema changes follow expand, migrate/backfill, verify, then contract. Old Flutter, old Next.js, new Next.js, and rollback backend builds are tested against the expanded schema before rollout.
- Backfills are resumable, idempotent, observable, rate-limited/throttled, and can pause without corrupting state. Progress, failures, retry counts, and database load have alerts.
- Contraction is prohibited until the relevant Flutter dashboard is retired, the Next.js rollback window and artifact-retention window have expired, telemetry shows no old client, and backend/operations/migration owners approve a separate issue.
- #121 and #137 must replace/reconcile the current `backend/docker-entrypoint.sh` startup `prisma migrate deploy` behavior before production shadow.

### Compatibility test matrix

For every migrated write workflow:

1. Create/update in Flutter, verify in Next.js and backend.
2. Create/update in Next.js, verify in Flutter where the legacy feature exists and backend.
3. Alternate updates between clients and verify concurrency/conflict behavior.
4. Verify audit/log attribution and permissions.
5. Roll routing back to Flutter and confirm the resulting record remains operable.

Seeded tests never run destructive cleanup against production. Production verification uses dedicated allowlisted records that are clearly labeled and safely removable through normal application behavior.

## Observability and thresholds

Issue #120 implements dashboards and alerts segmented by application, release, environment, route, role, and cohort without storing secrets or sensitive payloads.

Default rollback triggers for a rollout cohort:

| Signal | Trigger |
|---|---|
| Security/authorization | Any confirmed cross-role, cross-vendor, session, CSRF bypass, or sensitive-data exposure |
| Data integrity | Any confirmed loss, corruption, duplicate financial/order mutation, or unrecoverable incompatibility |
| Critical workflow | Two reproducible failures or one widespread failure in login, product/order management, payout/earnings, approval, moderation, or destructive actions |
| Server errors | >=2% 5xx for dashboard API requests over 15 minutes and materially above the Flutter/baseline rate |
| Client failures | >=1% unhandled route/client exceptions over 15 minutes or a 2x baseline increase, whichever is stricter |
| Authentication | >=2% unexpected refresh/session failures over 15 minutes or a 2x baseline increase |
| Latency | p95 critical-route latency >2 seconds for 15 minutes and >1.5x baseline, excluding declared external Stripe navigation |
| Support | Three independent users report the same blocking regression in a cohort, or one report confirms security/data loss |

Measurement rules:

- Server/error denominators are eligible completed dashboard API requests, excluding health checks, client-cancelled requests, expected validation/authorization 4xx, and declared synthetic probes. Authentication uses attempted refresh/session restorations; client failures use loaded route sessions with one failure counted per session/route/release.
- Percentage alerts require at least 100 eligible events in the 15-minute window. Below that volume, the absolute fallback is five unexpected server/auth/client failures or two failures of the same critical workflow; confirmed security/data-integrity events remain zero-tolerance.
- Baseline is the preceding seven comparable business days for the same environment, route class, role, and time window, recorded before cohort entry. Staging is not the production baseline.
- Server latency is measured BFF receipt-to-response excluding declared external navigation; client route latency is navigation start-to-primary-content-ready. Alerts state which measure they use.
- Alerts evaluate every five minutes over the rolling window. Operations declares a threshold breach, starts the incident record, and may roll back immediately; security or data-integrity owners may independently require rollback.

Thresholds may be tightened after staging/production-shadow evidence; loosening requires written operations, QA, security, migration, and product approval before the cohort begins. Low traffic never suppresses a confirmed security or integrity trigger.

## Rollback procedure

### Immediate application rollback

1. Incident commander declares rollback and records time, dashboard, release, cohort, symptom, and owner.
2. Freeze cohort expansion and high-risk deployments.
3. Put the affected Next.js dashboard into incident read-only mode: reject new high-impact mutations with a clear banner while allowing safe status/reconciliation reads.
4. Drain in-flight requests for the bounded deployment timeout. Record correlation and idempotency keys plus entity IDs for incomplete/unknown outcomes; do not terminate mutation workers blindly.
5. Activate the dashboard-specific kill switch for new navigations and route users to Flutter through the safe-login flow.
6. Before a user retries an ambiguous financial, order, payout, destructive, inventory, or upload action in Flutter, query the authoritative backend by correlation/idempotency/business identifier and reconcile whether it committed.
7. If required, redeploy the last known-good immutable Next.js artifact; do not build an unreviewed rollback artifact.
8. Preserve logs/traces and capture affected request/entity identifiers without sensitive payloads.
9. Verify Flutter login and critical workflows against records created/changed by Next.js.
10. Communicate incident/read-only status, retry guidance, and support escalation.
11. Diagnose and fix through the normal issue/review/test process before resuming at the previous safe cohort or earlier stage.

### Backend/database rollback

- Do not automatically roll back the database when routing rolls back the UI.
- Prefer forward fixes and disabling the affected mutation.
- A schema rollback is allowed only with a reviewed runbook proving no new data will be discarded and with backup/restore verification.
- If an API/backend release caused the incident, deploy the last compatible backend only when it supports both current data and Flutter contracts.
- Financial/order corrections require an auditable reconciliation procedure, never ad hoc direct production edits.

Rollback is complete only when monitoring is stable, affected data is reconciled, users have a working path, and an incident/follow-up owner is assigned.

## Go/no-go checklist

Record Pass/Fail/Not applicable, evidence, owner, and timestamp for each item.

### Release integrity

- [ ] Immutable build ID matches tested commit and deployment manifest.
- [ ] Required CI, contract drift, unit/component, Playwright, accessibility, and security checks pass.
- [ ] Environment schema, secrets, DNS/TLS, health checks, observability, and alerts are verified.
- [ ] Feature flags, stable cohorts, kill switch, and prior artifact rollback are tested.

### Parity and product

- [ ] Relevant vendor/admin parity checklist has no Blocked row.
- [ ] For Stage 2/3, every Deferred row has a complete register entry and approval for this exact cohort; for Stage 4+, the Deferred count is zero.
- [ ] Every Accepted difference has product-owner rationale.
- [ ] Direct URLs and loading/empty/error/forbidden/conflict/success states pass.
- [ ] Critical workflows and destructive/high-impact confirmations pass.
- [ ] Support documentation and known differences are ready.

### Security and session

- [ ] Missing, expired, wrong-role, banned/suspended, CSRF, rejected-origin, and cross-tenant tests pass.
- [ ] No protected-content flash or browser-readable refresh token exists.
- [ ] Cross-instance refresh concurrency and logout invalidation pass.
- [ ] No unresolved critical/high security finding exists.

### Data and operations

- [ ] Expand-and-contract compatibility and mixed-client test matrix pass.
- [ ] Stripe/order/payment/earnings/payout reconciliation applicable to the dashboard passes.
- [ ] Capacity and latency meet the approved baseline.
- [ ] On-call owner, incident channel, dashboards, alerts, and rollback commander are assigned.
- [ ] No unresolved critical/high data-integrity or operational defect exists.

### Approval

- [ ] QA owner recommends Go.
- [ ] Backend/API owner recommends Go.
- [ ] Web engineering owner recommends Go.
- [ ] Security reviewer recommends Go.
- [ ] Operations owner recommends Go.
- [ ] Relevant vendor/admin product owner recommends Go.
- [ ] Migration owner records the final Go decision and rollout cohort/time.

Any failed required item is No-go. A waiver is prohibited for security boundary, data integrity, payment/payout correctness, role/ownership authorization, rollback readiness, or a blocked critical parity workflow. Other waivers require an owner, impact/risk statement, mitigation, expiry date, and all relevant approvers.

## Evidence record template

```text
Dashboard: vendor | admin
Environment and release:
Stage/cohort:
Decision: GO | NO-GO | ROLLBACK
Decision time:
Migration owner:
Product owner:
QA owner:
Backend owner:
Web engineering owner:
Security reviewer:
Operations owner:
Parity report:
Automated test runs:
Security/accessibility reports:
Observability dashboard snapshot:
Compatibility evidence:
Rollback rehearsal/result:
Accepted differences/waivers:
Deferred rows/register (Stage 2/3 only):
Open follow-ups:
Next checkpoint:
```

## Issue ownership

- Vendor build and validation: #86–#102
- Admin build and validation: #103–#116 and #122
- Deterministic E2E data: #117
- Security review: #118
- Accessibility review: #101 and #119
- Observability: #120
- Staging/production deployment: #121
- Backend contract remediation: #129–#135
- Mutation idempotency and ambiguous outcomes: #136
- Production-safe database migration execution: #137

## Runbook sign-off checklist

- [ ] Stage entry/exit criteria are measurable and assigned.
- [ ] Vendor and admin can roll out and roll back independently.
- [ ] Parity evidence and accepted-difference ownership are explicit.
- [ ] Mixed Flutter/Next.js data and API compatibility is proven.
- [ ] Rollback avoids unnecessary database restoration and preserves auditability.
- [ ] Flutter freeze, retirement, archive, and backend-removal criteria are distinct.
- [ ] Go/no-go and non-waivable conditions are understood by all approvers.
