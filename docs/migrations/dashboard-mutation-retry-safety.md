# Dashboard mutation retry safety

## Contract

Duplicate-submit guards only prevent two clicks in one browser. They do not make a backend mutation idempotent and do not protect against a lost response, process restart, proxy retry, or a second API instance.

The vendor order-status mutation is protected by a PostgreSQL ledger scoped to `role:userId`. A client creates one opaque `Idempotency-Key` for an intended request and reuses that key only with the identical method, route, and canonical JSON body. The key is forwarded through the dashboard BFF.

- `Idempotency-Status: created` means this request claimed the key.
- `Idempotency-Status: replayed` and `Idempotency-Replayed: true` return the stored response without executing the mutation again.
- `IDEMPOTENCY_REQUEST_IN_PROGRESS` means wait for the stated `Retry-After` interval.
- `IDEMPOTENCY_KEY_REUSED` means the key was paired with a different request and must never be retried.
- `IDEMPOTENCY_OUTCOME_AMBIGUOUS` and `IDEMPOTENCY_PERSISTENCE_FAILED` require the supplied `reconciliation.method` and `reconciliation.path` before any new mutation.

Execution claims have a two-minute lease. An expired lease becomes ambiguous rather than allowing a blind replay. Completed responses are retained for 24 hours and may be removed with `npm run idempotency:cleanup`; ambiguous records are retained for investigation and reconciliation.

## Vendor and admin mutation classification

| Dashboard mutation                                                                      | Classification                           | Retry or reconciliation rule                                                   |
| --------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Vendor order status `PUT /api/orders/:id/status`                                        | Idempotency-key protected                | Reuse the key and body; on ambiguity, refresh `GET /orders/vendor/:id` first.  |
| Platform/vendor commission `PATCH /api/commission`, `PATCH /api/vendors/:id/commission` | Naturally idempotent absolute assignment | Retry the same rate; reload commission data afterward.                         |
| Vendor profile `PUT /api/vendor-profile`                                                | Idempotent only without new media        | Reload the profile after an upload timeout; never resend a file automatically. |
| Admin promo update `PUT /api/promos/:id`                                                | Naturally idempotent absolute assignment | Retry the same body; reload the promo.                                         |
| Auth logout                                                                             | Naturally idempotent                     | A repeated logout is a successful no-op.                                       |
| Auth login and vendor registration                                                      | Non-retryable                            | Reconcile the session or account before another submission.                    |
| Product, category, promo, or banner create                                              | Non-retryable                            | Search/list by the submitted stable business fields before creating again.     |
| Product/category/banner update with media; product media add/reorder/delete             | Non-retryable                            | Reload the product/category/banner and its media before another mutation.      |
| Product/category/banner/promo delete                                                    | Non-retryable                            | Reload the list/detail; a missing resource is the authoritative result.        |
| Vendor lifecycle, user status, and product moderation transitions                       | Non-retryable transition                 | Reload the target and use its current allowed actions.                         |

No dashboard mutation is automatically retried by the generated `openapi-fetch` client. The order-status OpenAPI operation declares `x-idempotency: key-required-for-retry` and exposes the optional `Idempotency-Key` header. Generated-client wrappers must treat that extension as metadata, not permission to retry: only callers that retain the original key and exact body may do so. All other mutations follow the matrix above.

## Ambiguous-outcome procedure

1. Stop automatic and manual retries for the affected operation.
2. Record the idempotency key, authenticated principal, operation, and timestamp; never log credentials or request bodies.
3. Call the returned authoritative reconciliation endpoint.
4. If the desired state is present, treat the original mutation as successful.
5. If the state is unchanged and the ledger is still in progress, wait for `Retry-After` and query again.
6. If the ledger remains ambiguous, preserve it and escalate with the correlated telemetry request ID. Use a new key only after an operator or the authoritative state proves the original effect did not occur.

## Operations

Alert on growth in `AMBIGUOUS` records, lease expirations, or persistence failures. Run the completed-record cleanup daily on one scheduler instance. Do not delete ambiguous records automatically. The `(scope, key)` unique constraint is the cross-instance lock; Redis and browser state are not authoritative.
