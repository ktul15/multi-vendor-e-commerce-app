# Stripe Connect vendor web test-mode verification

Use this checklist only with a dedicated Stripe **test-mode** account and non-production dashboard/database. Never paste API keys, onboarding URLs, bank tokens, or webhook secrets into screenshots, logs, issues, or commits.

## Verification status

The deterministic browser path was verified on 2 September 2026 with:

```bash
env PATH="$PWD/node_modules/.bin:$PATH" \
  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/uber_eats_clone_test \
  REDIS_URL=redis://localhost:6379/15 \
  WEB_E2E_RESET_CONFIRMATION=DELETE_E2E_DATA \
  bash scripts/run-web-e2e.sh e2e/vendor-workflows.spec.ts \
  --grep "Stripe Connect setup uses a top-level trusted redirect"
```

It passed using the dedicated E2E database/cache and an intercepted test-only `connect.stripe.com` response. This verifies authenticated vendor ownership, CSRF enforcement, same-origin initiation, and top-level allowlisted navigation without creating an external account.

A real connected-account walkthrough was not claimed: the repository's current India-registered Stripe platform cannot create the loss-liable Express accounts used by this integration. Issue #138 records that provider restriction, and #139 routes Indian sandbox marketplace vendors through Razorpay. Run the manual Stripe procedure below only with a legitimately supported Stripe platform or written Stripe approval.

## Required configuration

- Vendor dashboard: `NEXT_PUBLIC_APP_URL=https://<vendor-staging-origin>` and the normal dashboard session/BFF variables.
- Backend: a test-mode `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`, and `VENDOR_DASHBOARD_URL` matching that origin.
- Stripe Dashboard: complete **Settings → Connect → Platform profile**, including the platform's loss-liability responsibilities. Stripe rejects test connected-account creation until this acknowledgement is complete; application code must not attempt to bypass it.
- Redirects: `STRIPE_CONNECT_RETURN_URL=<origin>/stripe/return` and `STRIPE_CONNECT_REFRESH_URL=<origin>/stripe/refresh`.
- Stripe CLI authenticated to the same test account. Forward Connect events with `stripe listen --forward-connect-to <api-origin>/api/v1/vendor-payouts/webhook` and copy the ephemeral `whsec_...` value only into the backend process environment.
- An approved vendor fixture with no live-mode Stripe account. Do not use the inert `acct_qa_*` seeded identifiers with Stripe APIs.

## End-to-end procedure

1. Start the backend, vendor dashboard, test database, Redis, and Stripe event forwarding. Sign in as the approved fixture and open `/earnings`.
2. Confirm the page explains `NOT_STARTED` and offers **Set up Stripe payouts**. Inspect the browser request: it must be same-origin `POST /api/connect/onboard` with the dashboard CSRF header and no account ID or redirect URL supplied by the browser.
3. Confirm the browser performs a top-level navigation to `https://connect.stripe.com`; it must not embed Stripe or accept another origin returned by a mocked/modified response.
4. In Stripe's test form, use Stripe's current test values for the selected country. Leave required information incomplete once, follow the generated refresh path, and confirm exactly one replacement link is issued. An immediate replay must return to `/earnings?connect=refresh-loop`.
5. Complete the form and follow `/stripe/return`. Confirm it calls the backend status endpoint, clears the refresh guard, and redirects to `/earnings?connect=returned`. Ignore all Stripe return query parameters as proof.
6. Verify the UI from authoritative status data:
   - incomplete: setup can continue;
   - restricted: additional information is requested;
   - active: details, charges, and payouts are enabled;
   - backend/redirect failure: a retryable error is shown without navigating externally.
7. Replay the return URL and repeat status refresh. It must remain safe and must not create another connected account. Confirm the backend account-create call uses the stable vendor-profile idempotency key.
8. Record redacted browser, backend audit/log, webhook delivery, account ID suffix, and test timestamp evidence. Delete or reject the disposable test account through Stripe after evidence is retained.

## Automated verification

- `connect-onboarding-routes.test.ts` covers vendor authentication, CSRF, fixed ownership, Stripe-origin allowlisting, refresh-loop suppression, and return reconciliation.
- `earnings-overview.test.tsx` covers incomplete, restricted, active, returned, and failed presentation states.
- `vendor-workflows.spec.ts` covers the browser's same-origin start request and top-level Stripe navigation without calling external services in CI.
- `vendor-payout-connect.test.ts` covers Stripe capability-to-backend-state reconciliation.

Run:

```bash
pnpm --filter @repo/vendor-dashboard run test:critical
pnpm --filter @repo/vendor-dashboard test
pnpm exec playwright test e2e/vendor-workflows.spec.ts --project=vendor-chromium
```
