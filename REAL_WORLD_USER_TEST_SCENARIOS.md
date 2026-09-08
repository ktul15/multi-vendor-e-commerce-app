# Real-World User Test Scenarios

## Purpose

This document is a practical QA plan for testing the multi-vendor e-commerce platform as real users would use it. It covers the full system:

- Backend REST API
- Customer storefront
- Vendor dashboard
- Admin panel
- Cross-role marketplace workflows
- Security, data isolation, failure handling, accessibility, and regression coverage

The goal is not only to verify that screens load, but to prove that customers can shop, vendors can operate stores, admins can control the marketplace, and all roles remain isolated and secure.

## Test Philosophy

Test every scenario from a user outcome:

- A customer wants to find, buy, track, review, and reorder products.
- A vendor wants to apply, get approved, manage products, fulfill orders, and track earnings.
- An admin wants to approve vendors, moderate marketplace content, manage configuration, and monitor revenue.
- The system must protect users from data leaks, stale state, invalid payments, broken auth, and unreliable network conditions.

Every scenario should be checked on both happy paths and realistic failure paths.

## Environments

### Local Full-Stack Environment

Run backend services:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Run customer storefront:

```bash
cd storefront
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

Run vendor dashboard:

```bash
cd vendor_dashboard
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

Run admin panel:

```bash
cd admin_panel
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

### Recommended Browsers And Devices

- Chrome desktop
- Safari desktop
- Firefox desktop
- Mobile-width browser viewport for Flutter web apps
- Android emulator or device for storefront
- iOS simulator or device for storefront if available

### Baseline Verification Commands

Run these before manual QA:

```bash
cd backend
npm run build
npm run lint
npm test
```

```bash
cd storefront
flutter analyze
flutter test
```

```bash
cd vendor_dashboard
flutter analyze
flutter test
```

```bash
cd admin_panel
flutter analyze
flutter test
```

## Test Personas

Use distinct accounts so role isolation can be verified.

| Persona | Role | Purpose |
|---|---|---|
| Ava | Customer | New shopper, first checkout |
| Ben | Customer | Returning shopper with orders, wishlist, addresses |
| Vera | Vendor pending | Newly registered seller awaiting approval |
| Victor | Vendor approved | Active seller with products and orders |
| Nina | Vendor suspended/rejected | Restricted seller state |
| Alice | Admin | Marketplace operator |
| Mallory | Unauthorized user | Attempts cross-role or invalid access |

## Seed Data Requirements

Prepare realistic data before testing:

- At least 3 root categories and 2 nested categories per root.
- At least 20 active products across multiple categories.
- At least 5 inactive products.
- At least 3 vendors with different approval statuses: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.
- At least 2 products from each approved vendor.
- At least one product with variants.
- At least one product without images if the backend permits it.
- At least one out-of-stock variant.
- At least 3 promo codes:
  - valid percentage discount
  - valid fixed discount
  - expired or inactive promo
- Orders in all major statuses:
  - `PENDING`
  - `CONFIRMED`
  - `PROCESSING`
  - `SHIPPED`
  - `DELIVERED`
  - `CANCELLED`
  - `REFUNDED`
- Customer with multiple saved addresses.
- Customer with wishlist items.
- Customer with unread and read notifications.
- Banners with active/inactive states.
- Long names/descriptions and special characters for layout and escaping checks.

## End-To-End Marketplace Scenarios

### E2E-001: New Customer Buys From First Visit

Priority: P0

Steps:

1. Open the storefront as a logged-out user.
2. Browse home banners, categories, trending products, and new arrivals.
3. Open a product detail page.
4. Select a variant if available.
5. Add product to cart.
6. Register a new customer account when prompted or through auth flow.
7. Return to cart and verify the item remains available.
8. Add shipping address.
9. Apply a valid promo code.
10. Start checkout.
11. Complete Stripe payment using test card details.
12. Land on checkout success page.
13. Open order history.
14. Open order detail.

Expected result:

- Customer can complete the full purchase flow.
- Cart totals, discount, shipping address, payment status, and order detail are correct.
- Cart is cleared after order placement.
- Vendor order appears in the vendor dashboard.
- Admin can see the order in the admin panel.

### E2E-002: Multi-Vendor Cart And Order Split

Priority: P0

Steps:

1. Login as a customer.
2. Add products from Vendor A and Vendor B to cart.
3. Verify cart groups items by vendor if UI exposes grouping.
4. Apply promo if eligible.
5. Checkout.
6. Login as Vendor A and inspect orders.
7. Login as Vendor B and inspect orders.
8. Login as admin and inspect the full order.

Expected result:

- Customer sees one coherent checkout.
- Vendor A only sees Vendor A order items.
- Vendor B only sees Vendor B order items.
- Admin sees the complete order.
- Totals and vendor earnings are consistent.

### E2E-003: Vendor Application To First Sale

Priority: P0

Steps:

1. Open vendor dashboard.
2. Register as a new vendor with owner name, store name, email, and password.
3. Confirm the vendor lands in pending-review state.
4. Try to open dashboard, products, orders, and earnings.
5. Login as admin.
6. Open vendor management.
7. Approve the pending vendor.
8. Login again as the vendor.
9. Create a product with a valid category.
10. Login as customer.
11. Buy that product.
12. Login as vendor.
13. Confirm the order and move it through valid statuses.
14. Check vendor earnings.

Expected result:

- Pending vendors cannot operate the store before approval.
- Admin approval unlocks vendor operations.
- Product becomes available to customers.
- Vendor sees only their own order and earnings.

### E2E-004: Admin Moderates Marketplace Health

Priority: P1

Steps:

1. Login as admin.
2. Review dashboard stats.
3. Create a category.
4. Create a banner.
5. Create a promo code.
6. Review vendor applications.
7. Suspend an approved vendor.
8. Deactivate a problematic product.
9. Inspect platform orders and revenue.
10. Change commission settings if supported.

Expected result:

- Admin actions update customer/vendor-facing behavior.
- Suspended vendor loses operational access.
- Inactive/deactivated product no longer appears as purchasable.
- Platform analytics remain consistent after changes.

## Customer Storefront Scenarios

### Customer Auth

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-AUTH-001 | P0 | Register with valid name, email, and password | Account is created, tokens are stored, user lands in authenticated state |
| C-AUTH-002 | P1 | Register with existing email | Error is visible and account is not duplicated |
| C-AUTH-003 | P1 | Register with invalid email, short password, blank fields | Inline validation blocks submit |
| C-AUTH-004 | P0 | Login with valid customer account | User lands on customer app home/authenticated state |
| C-AUTH-005 | P0 | Login with vendor/admin account | Customer app blocks or safely rejects non-customer access according to product rules |
| C-AUTH-006 | P1 | Login with wrong password | Error appears, password is not cleared unless intended, no token stored |
| C-AUTH-007 | P1 | Logout | Token is cleared and protected pages redirect |
| C-AUTH-008 | P0 | Expired access token | App refreshes token or logs out safely without data leak |
| C-AUTH-009 | P2 | Forgot password flow | UI validates email and backend response is handled when supported |

### Home And Discovery

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-HOME-001 | P1 | Home loads with banners, categories, and products | All sections render without layout jumps |
| C-HOME-002 | P1 | Tap category | Product list opens with selected category filter |
| C-HOME-003 | P2 | Tap banner with link | Expected destination opens or safe no-op occurs |
| C-HOME-004 | P1 | Home API failure | Error or partial fallback appears without crash |
| C-HOME-005 | P2 | Empty categories/products | Empty states render clearly |
| C-HOME-006 | P2 | Pull to refresh if available | Data reloads and stale errors clear |

### Product Browsing

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-PLP-001 | P1 | Browse product listing | Product image, name, price, rating, vendor/category render |
| C-PLP-002 | P1 | Search by known product name | Matching products appear |
| C-PLP-003 | P1 | Search unknown term | Empty state appears without stale results |
| C-PLP-004 | P1 | Sort by newest, price, rating, popularity | Results reload and order matches backend |
| C-PLP-005 | P1 | Filter by category, price, rating, stock | Results match active filters |
| C-PLP-006 | P1 | Clear filters | Filters reset while preserving intended navigation context |
| C-PLP-007 | P2 | Pagination/infinite scroll | More products load once without duplicates |
| C-PLP-008 | P2 | Network failure during pagination | Existing list remains usable and error is shown |

### Product Detail

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-PDP-001 | P1 | Open product detail | Product fields, images, variants, stock, reviews, vendor render |
| C-PDP-002 | P1 | Select each variant | Price/stock state updates correctly |
| C-PDP-003 | P0 | Add in-stock variant to cart | Cart count and cart contents update |
| C-PDP-004 | P1 | Add out-of-stock variant | Button is disabled or backend error is handled clearly |
| C-PDP-005 | P1 | Logged-out add to cart | User is prompted to login; no unauthorized mutation |
| C-PDP-006 | P1 | Toggle wishlist | Wishlist state updates and persists after reload |
| C-PDP-007 | P2 | Product with missing image | Placeholder renders cleanly |
| C-PDP-008 | P2 | Long product name/description | Text wraps or truncates without overlap |

### Cart

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-CART-001 | P0 | Add product to cart | Item appears with correct price, quantity, and total |
| C-CART-002 | P1 | Increase/decrease quantity | Totals update and quantity boundaries are enforced |
| C-CART-003 | P1 | Remove item | Item disappears and totals update |
| C-CART-004 | P1 | Clear cart | Cart becomes empty |
| C-CART-005 | P1 | Apply valid promo | Discount appears and total updates |
| C-CART-006 | P1 | Apply invalid/expired promo | User sees clear error; total is unchanged |
| C-CART-007 | P0 | Cart with unavailable product | App blocks checkout or explains issue |
| C-CART-008 | P1 | Cart persistence after app restart | Cart reloads from backend |

### Addresses

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-ADDR-001 | P1 | Add valid address | Address appears in saved addresses |
| C-ADDR-002 | P1 | Edit address | Updated values persist |
| C-ADDR-003 | P1 | Delete non-default address | Address is removed |
| C-ADDR-004 | P1 | Set default address | Default state updates and only one default remains |
| C-ADDR-005 | P1 | Submit invalid address | Inline validation prevents save |
| C-ADDR-006 | P2 | Address API failure | Previous address list remains safe |

### Checkout And Payment

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-CHK-001 | P0 | Checkout with default address and valid cart | Payment starts and order is created after success |
| C-CHK-002 | P0 | Checkout with no address | User must add/select address |
| C-CHK-003 | P0 | Stripe payment success | Payment and order status reflect success |
| C-CHK-004 | P0 | Stripe card declined | No paid order is created; user can retry |
| C-CHK-005 | P1 | Payment intent/session API failure | Error appears and cart remains intact |
| C-CHK-006 | P1 | Double-tap pay/order button | Only one order/payment is created |
| C-CHK-007 | P1 | App closed during checkout | Returning user sees consistent cart/order/payment state |

### Orders

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-ORD-001 | P1 | Order history loads | Orders show number, date, status, total |
| C-ORD-002 | P1 | Open order detail | Items, address, status timeline, payment info render |
| C-ORD-003 | P1 | Cancel eligible order | Status updates and vendor/admin reflect cancellation |
| C-ORD-004 | P1 | Try cancel shipped/delivered order | Action is hidden or rejected clearly |
| C-ORD-005 | P2 | Empty order history | Friendly empty state appears |
| C-ORD-006 | P1 | Order status updated by vendor | Customer sees updated status after refresh |

### Reviews

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-REV-001 | P1 | Review delivered product | Review is created and rating updates |
| C-REV-002 | P1 | Try review without purchase | App/backend rejects |
| C-REV-003 | P1 | Edit/delete own review if supported | Changes persist and product rating recalculates |
| C-REV-004 | P1 | View review list | Pagination/sorting and empty states work |
| C-REV-005 | P2 | Long review text | Text displays safely without layout break |

### Wishlist, Notifications, Settings

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| C-WISH-001 | P1 | Add/remove wishlist item | State persists across sessions |
| C-WISH-002 | P1 | Move wishlist item to cart if exposed | Cart updates and wishlist state is correct |
| C-NOTIF-001 | P1 | Open notifications | Read/unread state and timestamps display |
| C-NOTIF-002 | P1 | Mark notification as read | State persists |
| C-SET-001 | P2 | Toggle dark mode | Theme updates and persists |
| C-SET-002 | P1 | Logout from settings | User returns to logged-out state |

## Vendor Dashboard Scenarios

### Vendor Auth And Approval

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| V-AUTH-001 | P0 | Vendor registration | Vendor account and pending profile are created |
| V-AUTH-002 | P1 | Duplicate registration | Error appears; no duplicate vendor |
| V-AUTH-003 | P0 | Vendor login | Approved vendor enters dashboard |
| V-AUTH-004 | P0 | Customer/admin login to vendor app | Access is blocked according to vendor-only rule |
| V-AUTH-005 | P1 | Pending vendor opens operational pages | Status gate blocks dashboard/products/orders/earnings |
| V-AUTH-006 | P1 | Rejected/suspended vendor opens operational pages | Status-specific block appears |
| V-AUTH-007 | P1 | Logout | Tokens clear and protected routes redirect |

### Store Profile

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| V-STORE-001 | P1 | Load store profile | Store name, description, status badge render |
| V-STORE-002 | P1 | Pending vendor edits store profile | Save succeeds if backend permits pending edits |
| V-STORE-003 | P1 | Approved vendor edits store profile | Save succeeds and refreshed values display |
| V-STORE-004 | P1 | Rejected/suspended vendor edits profile | Fields disabled or save rejected |
| V-STORE-005 | P2 | Invalid store name/description | Validation blocks save |
| V-STORE-006 | P2 | Store profile API failure | Error state appears with retry |

### Vendor Products

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| V-PROD-001 | P1 | Product list loads | Only current vendor products appear |
| V-PROD-002 | P1 | Create product with category picker | Product is created and appears in list |
| V-PROD-003 | P1 | Create inactive product | Product remains inactive after reload |
| V-PROD-004 | P1 | Product form validation | Name, description, price, category validation blocks bad save |
| V-PROD-005 | P1 | Edit product | Updated fields persist |
| V-PROD-006 | P1 | Delete product without orders | Product disappears |
| V-PROD-007 | P1 | Delete product with orders | Backend blocks or handles safely; UI shows error |
| V-PROD-008 | P1 | Vendor tries to edit another vendor product | Backend rejects and no data is exposed |
| V-PROD-009 | P2 | No categories available | Create flow explains product cannot be created yet |
| V-PROD-010 | P2 | Long product fields | Table/dialog layout remains usable |

### Vendor Orders

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| V-ORD-001 | P1 | Orders list loads | Current vendor order lines render |
| V-ORD-002 | P1 | Filter by status | List matches selected status |
| V-ORD-003 | P1 | Pending to confirmed | Status updates and customer/admin reflect it |
| V-ORD-004 | P1 | Confirmed to processing | Status updates |
| V-ORD-005 | P1 | Processing to shipped | Tracking number and carrier are required |
| V-ORD-006 | P1 | Shipped to delivered | Status updates |
| V-ORD-007 | P1 | Terminal status update | Delivered/cancelled/refunded cannot move forward |
| V-ORD-008 | P1 | Invalid stale transition | Backend rejects and UI remains consistent |
| V-ORD-009 | P0 | Vendor data isolation | Vendor cannot see another vendor's order items |

### Vendor Dashboard, Earnings, Analytics

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| V-DASH-001 | P1 | Dashboard summary loads | Sales, orders, revenue chart, recent orders render |
| V-DASH-002 | P1 | Dashboard empty state | New vendor with no orders sees clean empty states |
| V-EARN-001 | P1 | Earnings page loads | Summary, chart, top products render |
| V-EARN-002 | P1 | Switch sales period | Chart reloads and labels are correct |
| V-EARN-003 | P1 | Vendor earnings match completed orders | Totals and commission match backend data |
| V-EARN-004 | P2 | Analytics API failure | Error/retry appears without crash |

## Admin Panel Scenarios

### Admin Auth And Shell

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-AUTH-001 | P0 | Admin login | Admin reaches dashboard |
| A-AUTH-002 | P0 | Customer/vendor login to admin panel | Access is blocked and no token is persisted |
| A-AUTH-003 | P1 | Protected route while logged out | Redirects to login |
| A-AUTH-004 | P1 | Logout | Session clears |
| A-NAV-001 | P1 | Navigate all admin sections | Shell remains stable and selected destination updates |
| A-NAV-002 | P2 | Deep link into edit/detail route | Page loads or returns with clear error |

### Admin Dashboard

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-DASH-001 | P1 | Dashboard loads platform stats | Users, vendors, orders, revenue render |
| A-DASH-002 | P1 | Revenue chart period switch | Chart updates |
| A-DASH-003 | P2 | Empty platform data | Empty states do not break layout |
| A-DASH-004 | P1 | Dashboard API failure | Error state/retry appears |

### Users

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-USER-001 | P1 | User list loads | Users show role/status/profile fields |
| A-USER-002 | P1 | Search users | Results match name/email |
| A-USER-003 | P1 | Filter by role | List matches selected role |
| A-USER-004 | P1 | Ban customer | User becomes banned and cannot operate if backend enforces it |
| A-USER-005 | P1 | Unban customer | Access restored |
| A-USER-006 | P2 | User detail | Correct user data displays |

### Vendors

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-VEND-001 | P1 | Vendor list loads | Store, owner, status, joined date render |
| A-VEND-002 | P0 | Approve pending vendor | Vendor can operate dashboard afterward |
| A-VEND-003 | P1 | Reject pending vendor | Vendor sees rejected state |
| A-VEND-004 | P1 | Suspend approved vendor | Vendor loses operational access |
| A-VEND-005 | P1 | Vendor status filters | Results match selected status |
| A-VEND-006 | P1 | Vendor action failure | Status remains unchanged and error appears |

### Categories

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-CAT-001 | P1 | Category tree loads | Root and child categories render |
| A-CAT-002 | P1 | Create root category | Category appears in admin and storefront filters |
| A-CAT-003 | P1 | Create subcategory | Nested relationship displays |
| A-CAT-004 | P1 | Edit category | Name/image/parent changes persist |
| A-CAT-005 | P1 | Delete unused category | Category disappears |
| A-CAT-006 | P1 | Delete category used by products/children | Backend blocks with clear error |
| A-CAT-007 | P0 | Prevent circular parent | Invalid parent choices are blocked |

### Product Moderation

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-PROD-001 | P1 | Product list loads | Product, vendor, category, status render |
| A-PROD-002 | P1 | Search/filter products | Results match filters |
| A-PROD-003 | P1 | Deactivate active product | Product is no longer purchasable |
| A-PROD-004 | P1 | Activate inactive product | Product returns to storefront |
| A-PROD-005 | P1 | Delete product | Product is removed or blocked if referenced |
| A-PROD-006 | P2 | Product detail | Correct data displays |

### Orders

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-ORD-001 | P1 | All orders load | Admin sees marketplace-wide orders |
| A-ORD-002 | P1 | Filter by status | Results match status |
| A-ORD-003 | P1 | Date range filter | Results match selected dates |
| A-ORD-004 | P1 | Combined filters | Status and date apply together |
| A-ORD-005 | P1 | Order detail | Customer, vendor, items, payment, status display |
| A-ORD-006 | P2 | Empty result | Empty state appears |

### Finance

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-FIN-001 | P1 | Finance loads | Revenue, commission, summaries render |
| A-FIN-002 | P1 | Switch revenue period | Data updates |
| A-FIN-003 | P1 | Apply custom date range | Revenue matches date range |
| A-FIN-004 | P1 | Edit valid commission | New rate persists |
| A-FIN-005 | P1 | Invalid commission | Validation blocks save |
| A-FIN-006 | P1 | Commission save failure | Previous value remains |

### Banners And Promotions

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A-BAN-001 | P1 | Banner list loads | Active/inactive banners display |
| A-BAN-002 | P1 | Create banner | Banner appears on storefront if active |
| A-BAN-003 | P1 | Edit banner | Storefront reflects changes |
| A-BAN-004 | P1 | Delete banner | Banner disappears |
| A-PROMO-001 | P1 | Promo list loads | Codes, type, value, usage limits render |
| A-PROMO-002 | P1 | Create percentage promo | Customer can apply eligible code |
| A-PROMO-003 | P1 | Create fixed promo | Customer can apply eligible code |
| A-PROMO-004 | P1 | Expired/inactive promo | Customer cannot apply code |
| A-PROMO-005 | P1 | Delete promo | Customer can no longer use it |

## Backend/API Scenarios

### API Auth And Authorization

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| API-AUTH-001 | P0 | Missing bearer token on protected route | 401 response |
| API-AUTH-002 | P0 | Invalid token | 401 response |
| API-AUTH-003 | P0 | Expired token refresh flow | Refresh works or token is rejected safely |
| API-AUTH-004 | P0 | Customer calls vendor-only endpoint | 403 response |
| API-AUTH-005 | P0 | Vendor calls admin endpoint | 403 response |
| API-AUTH-006 | P0 | Vendor accesses another vendor resource | 403/404 without data leak |

### Data Validation

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| API-VAL-001 | P1 | Invalid UUID path params | 400 response |
| API-VAL-002 | P1 | Missing required fields | 400 response with useful message |
| API-VAL-003 | P1 | Negative prices/quantities | 400 response |
| API-VAL-004 | P1 | Bad date ranges | 400 response |
| API-VAL-005 | P1 | Oversized strings | Rejected or safely stored according to schema |
| API-VAL-006 | P1 | HTML/script-like input | Stored/displayed as text, not executable |

### Payments And Webhooks

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| API-PAY-001 | P0 | Create payment for valid order | Payment session/intent is created |
| API-PAY-002 | P0 | Webhook payment success | Payment/order/earnings update idempotently |
| API-PAY-003 | P0 | Duplicate webhook delivery | No duplicate earnings/order mutations |
| API-PAY-004 | P0 | Invalid webhook signature | Rejected |
| API-PAY-005 | P1 | Payment for another user's order | Rejected |

### File Uploads

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| API-UP-001 | P1 | Upload valid image | URL is stored and returned |
| API-UP-002 | P1 | Upload invalid file type | Rejected |
| API-UP-003 | P1 | Upload oversized file | Rejected |
| API-UP-004 | P2 | Cloudinary/storage failure | API returns safe error and data remains unchanged |

## Security And Privacy Scenarios

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| SEC-001 | P0 | Customer cannot read another customer's orders | Access rejected |
| SEC-002 | P0 | Vendor cannot read another vendor's products/orders/earnings | Access rejected |
| SEC-003 | P0 | Non-admin cannot manage users/vendors/categories/promos | Access rejected |
| SEC-004 | P0 | Token remains after logout | Token is blacklisted/cleared and cannot access protected API |
| SEC-005 | P1 | Rapid login attempts | Rate limiting or safe failure behavior |
| SEC-006 | P1 | XSS-like input in names/descriptions/reviews | Rendered as text only |
| SEC-007 | P1 | SQL-like strings in search fields | No crash or data leak |
| SEC-008 | P1 | Browser back after logout | Protected pages are not visible with live data |
| SEC-009 | P1 | Refresh token reuse after logout | Rejected |

## Network And Reliability Scenarios

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| NET-001 | P1 | Backend offline at app startup | App shows friendly unavailable state |
| NET-002 | P1 | Request timeout | User can retry and no duplicate mutation occurs |
| NET-003 | P1 | 401 during active session | App clears auth and redirects |
| NET-004 | P1 | 403 during mutation | UI explains permission issue and preserves old state |
| NET-005 | P1 | 500 from backend | Friendly error, no crash |
| NET-006 | P1 | Malformed API response | Error state instead of crash |
| NET-007 | P1 | Slow network | Skeleton/loading states appear; buttons disable during submit |
| NET-008 | P1 | Double-click submit buttons | One mutation only |

## Accessibility And Usability Scenarios

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| A11Y-001 | P2 | Keyboard navigation through forms/dialogs | All controls reachable in logical order |
| A11Y-002 | P2 | Screen reader labels for icon buttons | Actions are announced meaningfully |
| A11Y-003 | P2 | Text scale 125%, 150%, 200% | Critical UI remains usable |
| A11Y-004 | P2 | Color contrast on status chips/errors/buttons | Text is readable |
| A11Y-005 | P2 | Dialog focus trap | Focus enters dialog and returns after close |
| A11Y-006 | P2 | Loading states | User understands work is in progress |
| A11Y-007 | P2 | Error messages | Messages explain what happened and what to do next |

## Layout And Cross-Platform Scenarios

| ID | Priority | Scenario | Expected Result |
|---|---:|---|---|
| UI-001 | P1 | Desktop web at 1440px | Dashboards/tables use available space |
| UI-002 | P1 | Tablet width | Navigation and tables remain usable |
| UI-003 | P1 | Mobile-width web for dashboards | Bottom navigation/drawer works; no clipped controls |
| UI-004 | P1 | Storefront small mobile screen | Checkout/product/cart flows fit without overlap |
| UI-005 | P2 | Very long names/order numbers | Text wraps/truncates cleanly |
| UI-006 | P2 | Empty, loading, error state per major page | Consistent presentation |
| UI-007 | P2 | Dark mode storefront | Text and icons remain readable |

## Regression Smoke Suites

### Customer Smoke Suite

Run after every storefront change:

1. Register/login as customer.
2. Browse home.
3. Search for a product.
4. Open product detail.
5. Add product to cart.
6. Update cart quantity.
7. Apply valid and invalid promo.
8. Add/select address.
9. Complete checkout using Stripe test payment.
10. Open order detail.
11. Toggle wishlist.
12. Logout.

### Vendor Smoke Suite

Run after every vendor dashboard change:

1. Register a new vendor.
2. Confirm pending status gate.
3. Approve vendor as admin.
4. Login as approved vendor.
5. Edit store profile.
6. Create product using category picker.
7. Edit product.
8. Filter orders.
9. Move one order through a valid status transition.
10. Check earnings.
11. Logout.

### Admin Smoke Suite

Run after every admin panel change:

1. Login as admin.
2. Review dashboard.
3. Create/edit category.
4. Approve/reject vendor.
5. Search users.
6. Moderate product.
7. Filter orders by status/date.
8. Create/edit banner.
9. Create/apply promo through storefront.
10. Review finance page.
11. Logout.

### Backend Smoke Suite

Run after every backend change:

1. Build TypeScript.
2. Run lint.
3. Run full Jest suite.
4. Register/login customer.
5. Register/login vendor.
6. Login admin.
7. Create category as admin.
8. Create product as approved vendor.
9. Add product to cart as customer.
10. Place order.
11. Process payment webhook.
12. Update vendor order status.
13. Verify customer, vendor, and admin views are consistent.

## Completion Criteria

Do not call the project complete until all of these are true:

- Git worktree is clean or all remaining changes are intentional and committed.
- Backend `npm run build` passes.
- Backend `npm run lint` passes.
- Backend `npm test` passes.
- `flutter analyze` passes for storefront, vendor dashboard, and admin panel.
- `flutter test` passes for storefront, vendor dashboard, and admin panel.
- Customer E2E checkout succeeds with test payment.
- Vendor application and admin approval flow succeeds.
- Vendor product/order/earnings workflow succeeds.
- Admin categories, vendors, products, orders, banners, promos, and finance workflows succeed.
- Cross-role access attempts are rejected.
- Manual QA smoke suites pass on desktop and mobile-width layouts.

## Known High-Risk Areas To Prioritize

- Category creation/edit/delete because backend category integration tests recently failed.
- Backend lint configuration because test globals and Node/Express globals currently need cleanup.
- Stripe payment idempotency and webhook handling.
- Vendor data isolation for products, orders, and earnings.
- Pending/rejected/suspended vendor status handling.
- Product availability changes after admin moderation.
- Promo code discount accuracy.
- Checkout duplicate submission protection.
- Expired token behavior across all three Flutter apps.
- Storefront forgot-password behavior if backend/UI support is incomplete.
- Banner navigation behavior from storefront home.

## Test Evidence Template

Use this format for each manual run:

```text
Run ID:
Date:
Tester:
Environment:
Backend commit:
Storefront build:
Vendor dashboard build:
Admin panel build:

Scenario IDs tested:
Passed:
Failed:
Blocked:

Defects found:
- ID:
  Severity:
  Area:
  Steps:
  Expected:
  Actual:
  Screenshot/video:
  Logs:

Notes:
```
