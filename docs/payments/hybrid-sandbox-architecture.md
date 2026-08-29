# Hybrid payments sandbox architecture

This portfolio application is sandbox-only. It must never accept live keys,
real bank details, KYC documents, or real money. The platform is the merchant
of record: it owns the customer charge, pays provider fees, calculates platform
commission, initiates refunds, handles disputes, and owns settlement
reconciliation. Vendors receive only their persisted net allocation.

## Provider policy

| Vendor settlement | Currency | Provider | Marketplace mechanism |
| --- | --- | --- | --- |
| India (`IN`) | INR | Razorpay Test Mode | Route Order transfers to Linked Accounts |
| Supported non-India country | INR in this sandbox | Stripe Test Mode | Connect transfers |

An administrator assigns `paymentProvider` and `settlementCountry` on the
server. Checkout ignores client-supplied provider values. New Indian vendors
default to Razorpay. A cart containing assignments from both providers is
rejected before order creation; the customer must check out provider-compatible
items separately. Stripe-only and Razorpay-only carts create one payable order.

Provider SDK calls live behind `PaymentGateway`. Orders, payments, vendor
earnings, payouts, refunds, and webhook events store neutral provider fields.
The database migration preserves prior Stripe identifiers while renaming them.
Amounts are calculated from persisted orders in integer paise using a
largest-remainder allocation, then commission is rounded per vendor. Vendor net
transfers can never exceed the captured total.

Checkout creation reserves a short database lease before contacting a provider.
Stripe uses the payment ID as its idempotency key; Razorpay retries first look up
the stable order receipt. Concurrent requests therefore cannot orphan a second
provider checkout, and an expired lease can be safely reclaimed.
Stripe vendor transfers use the earning ID as their provider idempotency key.

## Razorpay sandbox lifecycle

The backend creates an INR Razorpay Order with Route transfers. Flutter opens
Standard Checkout using only the returned test key ID and Order ID. The backend
verifies `order_id|payment_id` before accepting confirmation; signed webhooks
remain authoritative. `x-razorpay-event-id` plus provider is unique, so duplicate
payment, transfer, reversal, refund, and settlement events are harmless.
Transfer failures remain auditable as failed earnings. Full and partial refunds
reserve their amount in a serializable transaction before the provider call.
Ambiguous provider results remain pending and block retries until reconciliation.
Confirmed customer refunds and vendor-transfer reversals have separate states,
so a reversal failure cannot cause a duplicate customer refund. Successful
refunds store cumulative reversed paise per earning and reverse only the delta
to the new cumulative target. Reversal work uses an expiring retry lease.
Razorpay refund receipts and reversal notes provide stable reconciliation keys;
an original full refund uses Razorpay `reverse_all`.

Real Razorpay Test Mode requires an explicit private webhook secret. Only the
deterministic mock may use its documented local fallback. Provider webhooks are
mounted before global rate limiting, while authenticated checkout,
confirmation, and refund routes remain behind it.

Route Test Mode is not available on every Razorpay account. With
`RAZORPAY_SANDBOX_MOCK=true`, the adapter produces stable `order_mock_*`,
`pay_mock_*`, `trf_mock_*`, and `rfnd_mock_*` identifiers and valid deterministic
test signatures. Production startup refuses mock mode.
Backend startup rejects Stripe or Razorpay live credentials, and the storefront
rejects non-test Stripe publishable keys.

## Sandbox walkthrough

1. Copy `backend/.env.example`; use Stripe and Razorpay **test** credentials, or
   leave Razorpay mock mode enabled. Never commit the resulting `.env`.
2. Apply Prisma migrations and start PostgreSQL, Redis, and the backend.
3. As admin, assign all vendors in the cart to Razorpay/`IN`, then run their
   sandbox onboarding. In mock mode this creates a deterministic linked account.
4. Add products from at least two Indian vendors and place the order. Verify the
   checkout response is `RAZORPAY`, its amount equals the order total in paise,
   and each earning has a Route transfer identifier.
5. Complete the deterministic mock checkout (or Razorpay Standard Checkout in
   Test Mode). Verify the payment succeeds and vendor orders confirm.
6. Replay the same signed webhook and confirm no state changes twice. Send a
   transfer-failed event and verify the matching earning becomes failed.
7. Issue partial and full sandbox refunds and verify refund audit rows and
   transfer reversal states. Repeat with non-Indian Stripe-assigned vendors.
8. Try a mixed-provider cart and verify order creation is rejected with guidance
   to check out the groups separately.

Moving to live payments is a separate project: Razorpay/Stripe approval, Indian
marketplace legal and tax review, KYC and bank-account handling, supported
country/currency validation, dispute operations, reconciliation jobs, and
production security controls are all still required.
