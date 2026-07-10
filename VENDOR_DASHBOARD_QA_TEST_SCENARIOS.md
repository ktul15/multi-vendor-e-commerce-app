# Vendor Dashboard QA Test Scenarios

## Scope

This document covers senior QA test scenarios for the Flutter `vendor_dashboard` app. It is based on the current app structure and behavior under `vendor_dashboard/lib`, including:

- Authentication and route guards
- Vendor shell navigation
- Dashboard analytics
- Product management
- Vendor order management
- Earnings and top products
- Store profile management
- Network, security, accessibility, and regression coverage

## Test Environment

- Run backend API and required services: PostgreSQL, Redis, Stripe/Firebase config where needed.
- Run vendor dashboard with the intended backend:

```bash
cd vendor_dashboard
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

Recommended test accounts:

- New vendor applicant created from `/register`
- Valid `VENDOR` account with `APPROVED` vendor profile
- Valid `VENDOR` account with `PENDING` vendor profile
- Valid `VENDOR` account with `REJECTED` or `SUSPENDED` vendor profile if backend supports it
- Valid `CUSTOMER` account
- Valid `ADMIN` account
- Expired-token vendor session

Recommended seed data:

- Vendor profile with store name, description, approval status, and commission
- Products owned by the vendor: active/inactive, priced with decimals, multiple pages
- Products owned by other vendors to verify isolation
- Categories available through backend so product create can use valid category IDs
- Vendor orders in `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, and `REFUNDED`
- Sales analytics for day/week/month periods
- Top products with revenue and quantity sold

## Test Data Rules

- Use unique product names per run, for example `QA_VENDOR_PRODUCT_20260530_001`.
- Keep at least one vendor order in each status for filter and transition validation.
- Keep more than one product page and more than one order page where backend pagination is available.
- Include long strings, special characters, decimal prices, zero/negative boundary attempts, and empty optional descriptions.
- Include at least one deleted or inaccessible product/order ID for 404 handling.

## Severity Guide

- `P0`: Blocks vendor access or corrupts vendor/customer data/security.
- `P1`: Breaks a major vendor workflow.
- `P2`: Functional issue with workaround.
- `P3`: UI polish, copy, layout, or minor consistency issue.

## Authentication And Session

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| AUTH-001 | P0 | Vendor login succeeds | Open `/login`, enter valid vendor email/password, submit | User is routed to dashboard, token is stored, API requests include bearer token |
| AUTH-002 | P0 | Vendor registration succeeds | Open `/register`, enter owner name, store name, email, password, confirm password, submit | Backend creates `VENDOR` user and `VendorProfile(status: PENDING)`, tokens are stored, user sees pending-review state |
| AUTH-003 | P1 | Duplicate vendor registration fails | Register with an existing email | Backend error appears, submit button is re-enabled, no duplicate account is created |
| AUTH-004 | P2 | Registration validation | Submit blank owner/store/email/password, invalid email, short password, mismatched confirm password | Inline validation blocks submit |
| AUTH-005 | P0 | Customer login is blocked | Login with valid customer credentials | Login fails with vendor-access error, no token is persisted, user stays on login |
| AUTH-006 | P1 | Admin login behavior | Login with valid admin credentials | Access matches product decision: admin can enter vendor dashboard or is explicitly blocked; no ambiguous state |
| AUTH-007 | P1 | Invalid credentials fail | Enter valid email format with wrong password | Error snackbar appears, submit button is re-enabled, no route change |
| AUTH-008 | P2 | Login validation | Submit empty form, invalid email, empty password | Inline validation appears for required/valid fields |
| AUTH-009 | P1 | Password visibility toggle | Enter password, tap visibility icon twice | Password switches visible/hidden without losing value |
| AUTH-010 | P0 | Protected route guard | Clear tokens, open `/`, `/products`, `/orders`, `/earnings`, `/store` | App redirects to `/login` |
| AUTH-011 | P1 | Authenticated user cannot return to auth pages | Login, then open `/login` or `/register` manually | App redirects to dashboard |
| AUTH-012 | P0 | Expired token logs out | Use expired/invalid access token, trigger any API call that returns 401 | Tokens are cleared and user is redirected to login |
| AUTH-013 | P1 | Logout works | Click logout action in shell/sidebar | Server logout is attempted, tokens are cleared, user lands on login |
| AUTH-014 | P1 | Logout still clears local state if server logout fails | Simulate logout API failure | User is still logged out locally and cannot access protected routes |

## Vendor Shell And Navigation

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NAV-001 | P1 | Sidebar destinations route correctly | Click Dashboard, Products, Orders, Earnings, Store | Correct page opens and selected sidebar item updates |
| NAV-002 | P2 | Browser/deep-link support | Open valid URLs directly after login | Page loads with expected data or safe loading state |
| NAV-003 | P2 | Protected deep links while logged out | Open `/orders` or `/store` with no token | App redirects to `/login`; after login the protected app is usable |
| NAV-004 | P2 | Shell persists across pages | Navigate among all shell routes | Sidebar/header remains stable and content swaps without full app reset |
| NAV-005 | P3 | Responsive layout | Test desktop, tablet, and narrow web width | Navigation, cards, tables, forms, and dialogs do not overlap or clip critical actions |

## Dashboard

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| DASH-001 | P1 | Dashboard loads analytics | Open dashboard | Summary cards, last-30-days revenue chart, and recent orders render from vendor analytics/order APIs |
| DASH-002 | P2 | Loading skeleton | Throttle API and reload dashboard | Skeleton appears until summary, sales, and recent orders complete |
| DASH-003 | P1 | Dashboard API failure | Force analytics or recent-orders failure | Error state appears with retry; retry reloads data |
| DASH-004 | P2 | Empty recent orders | Seed no vendor orders | Recent orders table handles empty state without layout break |
| DASH-005 | P2 | Data formatting | Validate currency, counts, order numbers, and dates | Values are formatted consistently and match backend response |
| DASH-006 | P1 | Vendor data isolation | Login as vendor A with vendor B orders/products seeded | Dashboard only shows vendor A analytics and recent orders |

## Products

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| PROD-001 | P1 | Product list loads | Open Products | Vendor products render with name, category, price, active state, and actions |
| PROD-002 | P1 | Product ownership isolation | Seed products for multiple vendors | Only current vendor products appear |
| PROD-003 | P2 | Product loading/error/empty states | Test slow API, failed API, empty product list | Skeleton, retryable error, and empty state display correctly |
| PROD-004 | P1 | Create active product | Click New Product, enter valid name, description, price, category UUID, active on | Product is created, list refreshes, product appears |
| PROD-005 | P1 | Create inactive product | Create with Active switch off | Product is created inactive and status persists after reload |
| PROD-006 | P1 | Product name validation | Submit blank or one-character name | Inline validation blocks save |
| PROD-007 | P1 | Description validation | Submit blank or under 10 characters | Inline validation blocks save |
| PROD-008 | P1 | Price validation | Submit blank, zero, negative, text, and more than two decimals | Invalid values are blocked or normalized by input formatter; no bad API call occurs |
| PROD-009 | P1 | Category ID validation on create | Submit blank, malformed UUID, and valid UUID | Invalid values are blocked; valid category ID saves |
| PROD-010 | P1 | Edit product fields | Open edit, change name, description, price, active state | Product updates and refreshed row shows new values |
| PROD-011 | P2 | Edit does not require category ID | Edit existing product | Dialog omits category ID and save works without changing category |
| PROD-012 | P1 | Delete product confirmation cancel | Open delete confirmation, cancel | Product remains and no API mutation occurs |
| PROD-013 | P1 | Delete product success | Confirm delete on product without blocking orders | Product disappears and total count decreases |
| PROD-014 | P1 | Delete product blocked by backend | Delete product with existing orders if backend blocks it | Error snackbar displays backend message and product remains |
| PROD-015 | P2 | Load more products | Seed more products than initial page, click Load more | More products append once and showing count updates |
| PROD-016 | P2 | Duplicate rapid saves | Double-click Create/Save if possible | Only one product is created or duplicate request is safely handled |

## Orders

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| ORD-001 | P1 | Vendor order list loads | Open Orders | Order number, customer, status, total, date, and update action render |
| ORD-002 | P1 | Status filters | Select All, Pending, Confirmed, Processing, Shipped, Delivered, Cancelled | Orders match selected status and active chip updates |
| ORD-003 | P1 | Vendor data isolation | Login as vendor A with vendor B orders seeded | Only vendor A order lines appear |
| ORD-004 | P1 | Forward transition pending to confirmed | Update a `PENDING` order | Dialog offers `CONFIRMED`; save updates row and preserves active filter |
| ORD-005 | P1 | Forward transition confirmed to processing | Update a `CONFIRMED` order | Dialog offers `PROCESSING`; save updates row |
| ORD-006 | P1 | Forward transition processing to shipped | Update a `PROCESSING` order | Dialog offers `SHIPPED` and requires tracking number and carrier |
| ORD-007 | P1 | Shipped tracking validation | Choose `SHIPPED`, leave tracking fields blank | Inline validation blocks save |
| ORD-008 | P1 | Forward transition shipped to delivered | Update a `SHIPPED` order | Dialog offers `DELIVERED`; save updates row |
| ORD-009 | P1 | Terminal status cannot update | Try updating `DELIVERED`, `CANCELLED`, or `REFUNDED` order | Dialog states status cannot be updated further; no mutation occurs |
| ORD-010 | P1 | Backend rejects invalid transition | Force invalid transition or stale status | Error snackbar appears and row status remains unchanged |
| ORD-011 | P2 | Empty filtered orders | Select a status with no orders | Empty state/table message appears without stale rows |
| ORD-012 | P2 | Order fetch failure after filter | Force API failure while changing filter | Error snackbar/error state appears and user can retry |

## Earnings

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| EARN-001 | P1 | Earnings page loads | Open Earnings | Summary cards, revenue chart, period control, and top products render |
| EARN-002 | P1 | Revenue period switch | Switch day/week/month if exposed | Chart reloads and selected period is reflected |
| EARN-003 | P2 | Top products empty | Seed sales with no top products | Top products table handles empty state without layout break |
| EARN-004 | P1 | Revenue values match backend | Compare chart points and totals to `/analytics/vendor/sales` and summary response | Values, labels, and currency formatting match |
| EARN-005 | P2 | Earnings API failure | Force summary, sales, or top-products failure | Error state/snackbar appears with retry; no crash |
| EARN-006 | P1 | Vendor data isolation | Login as different vendors | Earnings and top products reflect only current vendor |

## Store Profile

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| STORE-001 | P1 | Store profile loads | Open Store | Store name, description, and vendor approval badge render |
| STORE-002 | P2 | Approval badge states | Test `APPROVED`, `PENDING`, `REJECTED`, and unknown status | Badge text/color/icon reflect status or safe fallback |
| STORE-003 | P1 | Edit store name and description | Change both fields, save | Success snackbar appears and refreshed form shows saved values |
| STORE-004 | P1 | Store name validation | Save blank or one-character store name | Inline validation blocks save |
| STORE-005 | P2 | Description max length | Enter more than 1000 characters | UI prevents or reports length issue; no invalid save occurs |
| STORE-006 | P1 | Clear description | Clear description, save | Description is saved empty if backend permits it |
| STORE-007 | P1 | Save failure | Force profile update failure | Error snackbar appears and previous persisted profile remains |
| STORE-008 | P2 | Retry after profile load failure | Force `/vendor-profile/me` failure, then retry | Error state appears; retry reloads profile |
| STORE-009 | P1 | Duplicate save protection | Click Save repeatedly while request is in flight | Save button disables or only one update is submitted |

## Vendor Approval Status Gate

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| STATUS-001 | P1 | Pending vendor sees review state | Register a new vendor or login as `PENDING`, open `/` | Dashboard is replaced by pending-review state with store name/status and profile/logout actions |
| STATUS-002 | P1 | Pending vendor cannot access operations | As `PENDING`, open `/products`, `/orders`, `/earnings` | Status gate appears and no operational API mutation/list is attempted |
| STATUS-003 | P1 | Approved vendor sees dashboard | Admin approves vendor, vendor reloads `/` | Dashboard, products, orders, and earnings become accessible |
| STATUS-004 | P1 | Rejected vendor sees rejected state | Login as `REJECTED`, open operational routes | Rejected-state message appears; operational pages remain blocked |
| STATUS-005 | P1 | Suspended vendor sees suspended state | Login as `SUSPENDED`, open operational routes | Suspended-state message appears; operational pages remain blocked |

## Network And API Resilience

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NET-001 | P1 | Slow network | Throttle network for every major page | Skeleton or saving/loading state appears; buttons do not double-submit |
| NET-002 | P1 | Offline startup | Start app with API unavailable | Login/protected pages show actionable error, no crash |
| NET-003 | P1 | Malformed response | Return missing `data`, `items`, or `meta` | App shows friendly error state/snackbar |
| NET-004 | P0 | 401 from any endpoint | Return 401 for list/mutation | App logs out and redirects to login |
| NET-005 | P1 | 403 vendor action | Return 403 on product/order/store mutation | Error snackbar appears and UI state is not corrupted |
| NET-006 | P2 | 404 record during mutation | Delete product/order externally, then mutate from dashboard | App shows clear error and refreshes or preserves safe state |
| NET-007 | P1 | Refresh/filter after mutation | Update order status or product, then reload/filter | UI reflects backend state and does not show stale mixed data |

## Security And Authorization

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| SEC-001 | P0 | Customer cannot access vendor dashboard | Attempt login with customer role | Blocked before token persistence |
| SEC-002 | P0 | Vendor cannot access another vendor data | Attempt product/order APIs with another vendor's IDs | Backend rejects; app handles error without exposing data |
| SEC-003 | P0 | Protected API calls require bearer token | Remove token and call any module | Redirect to login on 401 |
| SEC-004 | P1 | Suspended/rejected vendor behavior | Login with suspended/rejected vendor if supported | App follows product rules and prevents disallowed mutations |
| SEC-005 | P1 | XSS-like text data | Seed product/store/order fields with `<script>` and HTML | Text displays safely as text, no script execution |
| SEC-006 | P1 | Price tampering | Attempt invalid price payload through intercepted request | Backend rejects and app shows error without corrupting list |

## Accessibility And Usability

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| A11Y-001 | P2 | Keyboard navigation | Tab through login, sidebar, product dialog, order dialog, store form | Focus order is logical and all controls are reachable |
| A11Y-002 | P2 | Dialog focus | Open product and status dialogs | Focus enters dialog; cancel/save are reachable; escape/back closes if platform supports it |
| A11Y-003 | P2 | Screen reader labels | Inspect icon-only controls such as logout, edit, delete, status | Tooltip/semantics identify the action |
| A11Y-004 | P2 | Color contrast | Check status badges, chips, charts, error/success snackbars | Text and controls meet readable contrast |
| A11Y-005 | P2 | Text scaling | Test 125%, 150%, 200% text scale | Forms, tables, charts, and dialogs remain usable without critical clipping |

## Cross-Platform And Layout

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| UI-001 | P2 | Web desktop | Test Chrome/Safari/Firefox at common desktop widths | Tables horizontally scroll where needed and shell remains stable |
| UI-002 | P2 | Tablet/narrow width | Resize to narrow width | Sidebar/content, filters, and dialog actions do not overlap |
| UI-003 | P2 | Long content | Seed very long product names, store descriptions, order numbers | Text truncates/wraps without breaking rows or forms |
| UI-004 | P3 | Empty states consistency | Force empty data in each module | Empty states use correct copy and spacing |
| UI-005 | P3 | Snackbar behavior | Trigger multiple errors quickly | Snackbars do not stack indefinitely or hide critical UI |

## Regression Smoke Suite

Run this after every vendor dashboard change:

1. Login with a vendor and verify dashboard loads.
2. Navigate through every sidebar destination.
3. Validate dashboard summary, chart, and recent orders.
4. Create, edit, toggle active state, and delete one vendor product.
5. Validate product form errors for name, description, price, and category UUID.
6. Filter orders by each status.
7. Move one order through a valid next status transition.
8. Verify `PROCESSING` to `SHIPPED` requires tracking number and carrier.
9. Confirm terminal orders cannot be updated.
10. Change earnings period and verify top products render.
11. Edit store name/description and verify approval badge remains visible.
12. Trigger a forced 401 and confirm logout redirect.
13. Logout manually and verify protected routes redirect to login.

## Automation Recommendations

- Add widget tests for login, product form dialog, order status dialog, and store profile form validation.
- Add cubit unit tests for dashboard/earnings load success and failure.
- Add cubit unit tests for product create/update/delete and load-more transitions.
- Add cubit unit tests for order filter and status update success/failure.
- Add repository tests with mocked Dio for malformed payloads and pagination metadata.
- Add screenshot/golden tests for dashboard, products table, orders table, and store page at desktop and tablet widths.

## High-Risk Areas To Prioritize

- Auth token restoration, 401 interceptor logout, and customer-role rejection.
- Vendor data isolation across products, orders, earnings, and store profile.
- Order status forward-only transitions and tracking requirements.
- Product create requiring raw category UUID input.
- Product delete behavior when orders already reference the product.
- Chart/table formatting for money, dates, and empty datasets.
- Duplicate submissions from dialogs and save buttons.
