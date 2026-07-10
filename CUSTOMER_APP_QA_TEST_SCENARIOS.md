# Customer App QA Test Scenarios

## Scope

This document covers senior QA test scenarios for the Flutter `storefront` customer shopping app. It is based on the current app structure and behavior under `storefront/lib`, including:

- Authentication and public/protected route guards
- Home, categories, banners, product listing, search, and product detail
- Wishlist
- Cart and promo preview
- Address management
- Checkout, Stripe payment intent, and checkout success
- Order history, order detail, and cancellation
- Reviews
- Notifications
- Settings, theme, network, security, accessibility, and regression coverage

## Test Environment

- Run backend API and required services: PostgreSQL, Redis, Stripe/Firebase config where needed.
- Run customer app with the intended backend:

```bash
cd storefront
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api/v1
```

Recommended test accounts:

- Valid `CUSTOMER` account with saved addresses, cart items, wishlist, orders, and reviews
- Valid `CUSTOMER` account with no saved data for empty-state checks
- Valid `VENDOR` account
- Valid `ADMIN` account
- Banned customer account if backend supports it
- Expired-token customer session

Recommended seed data:

- Categories with products, including empty categories
- Banners with and without link destinations
- Products: active/inactive, in-stock/out-of-stock, multiple variants, images, ratings, reviews, tags, and different vendors
- Products across price/rating ranges for filter and sort validation
- Cart with multiple vendors and quantities
- Promo codes: valid, invalid, expired, inactive, min-order-limited, percentage, and fixed discounts
- Addresses: none, one default, multiple addresses
- Orders in `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, and `REFUNDED`
- Notifications: read/unread and multiple pages
- Reviews: current user's review, other users' reviews, rating distribution

## Test Data Rules

- Use unique customer, product, address, and review identifiers per run, for example `QA_CUSTOMER_20260530_001`.
- Keep more than one page of products, search results, orders, notifications, reviews, and wishlist items.
- Include long strings, special characters, decimal prices, boundary quantities, empty optional comments, and HTML-like text.
- Keep at least one product without images or reviews if backend permits it.
- Keep at least one checkout scenario where payment succeeds and one where payment intent or Stripe confirmation fails.

## Severity Guide

- `P0`: Blocks customer access, checkout/payment, or exposes/corrupts data/security.
- `P1`: Breaks a major shopping workflow.
- `P2`: Functional issue with workaround.
- `P3`: UI polish, copy, layout, or minor consistency issue.

## Authentication And Session

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| AUTH-001 | P0 | Customer login succeeds | Open `/login`, enter valid customer email/password, submit | User is routed home, token is stored, API requests include bearer token |
| AUTH-002 | P1 | Register succeeds | Open `/register`, enter valid name/email/password/confirm password | Account is created, tokens are stored, user lands home |
| AUTH-003 | P1 | Duplicate register fails | Register with existing email | Backend error appears, no route change |
| AUTH-004 | P1 | Invalid login fails | Enter valid email format with wrong password | Error snackbar appears, submit button is re-enabled |
| AUTH-005 | P2 | Login validation | Submit empty form, invalid email, empty password | Inline validation appears |
| AUTH-006 | P2 | Register validation | Submit blank name, invalid email, short password, mismatched confirm password | Inline validation blocks submit |
| AUTH-007 | P2 | Forgot password validation | Open `/forgot-password`, submit blank or invalid email | Inline validation appears |
| AUTH-008 | P2 | Forgot password valid request | Submit existing email | Success feedback appears according to backend behavior |
| AUTH-009 | P0 | Protected route guard | Clear tokens, open `/cart`, `/checkout`, `/addresses`, `/orders`, `/notifications`, `/wishlist`, `/settings` | App redirects to `/login` |
| AUTH-010 | P1 | Public product deep links | Clear tokens, open `/product/<id>` and `/product/<id>/reviews` | Product detail and reviews are viewable without login |
| AUTH-011 | P1 | Authenticated user cannot return to auth pages | Login, then open `/login`, `/register`, `/forgot-password` | App redirects home |
| AUTH-012 | P0 | Expired token logs out | Use expired/invalid token, trigger protected API call | Tokens are cleared and protected navigation redirects to login |
| AUTH-013 | P1 | Logout works | Use logout from Settings | Server logout is attempted, tokens are cleared, user lands on login/home public state |
| AUTH-014 | P1 | Logout still clears local state if server logout fails | Simulate logout API failure | User is logged out locally and protected routes redirect to login |

## Routing And Navigation

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NAV-001 | P1 | Primary destinations route correctly | Navigate to Home, Products, Search, Cart, Wishlist, Orders, Addresses, Notifications, Settings | Correct page opens and back behavior is sensible |
| NAV-002 | P1 | Product list category deep link | Open `/products?title=Shoes&categoryId=<id>` | Product list title and category filter are applied |
| NAV-003 | P1 | Product detail deep link | Open `/product/<id>` | Product loads or error state appears for missing product |
| NAV-004 | P1 | Reviews deep link | Open `/product/<id>/reviews` with and without query metadata | Review list loads and safe fallback product metadata is used |
| NAV-005 | P1 | Checkout success deep link without route extra | Open `/checkout/success` directly | App redirects home gracefully without crash |
| NAV-006 | P2 | Back stack from shopping flow | Home to product list to product detail to cart to checkout, then back | Back navigation returns to expected prior screens without losing critical state |
| NAV-007 | P3 | Responsive layout | Test phone, tablet, web/narrow widths | App bars, bottom sheets, cards, and forms do not overlap or clip critical actions |

## Home And Discovery

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| HOME-001 | P1 | Home loads | Open home | Banners, categories, trending products, and new arrivals render |
| HOME-002 | P2 | Home loading skeleton | Throttle APIs and reload | Home skeleton appears until data completes |
| HOME-003 | P1 | Home API failure | Force categories/products/banner failure | Error state or partial failure handling appears without crash |
| HOME-004 | P2 | Empty categories/products | Seed no categories or no products | Empty sections render cleanly without stale data |
| HOME-005 | P1 | Category navigation | Tap category tile | Product list opens with selected category filter and title |
| HOME-006 | P2 | Banner navigation | Tap banner with valid product/category/link target if supported | Correct destination opens or safe no-op occurs for unsupported/empty link |
| HOME-007 | P2 | Product card navigation | Tap product from trending/new arrivals | Correct product detail opens |
| HOME-008 | P2 | Pull to refresh if available | Refresh home | Sections reload and stale errors clear |

## Product Listing

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| PLP-001 | P1 | Product list loads | Open `/products` | Product rows/cards render with image, name, price, rating, vendor/category info where available |
| PLP-002 | P1 | Infinite scroll/load more | Scroll near bottom with more pages available | Next page loads once and appends products |
| PLP-003 | P2 | End of list | Scroll after all products loaded | No duplicate loads; footer/end state is stable |
| PLP-004 | P1 | Sort newest | Select Newest sort | Products reload with `sort=newest` |
| PLP-005 | P1 | Sort popular | Select Popular sort | Products reload with `sort=popular` |
| PLP-006 | P1 | Sort price ascending/descending | Select Price Low to High and High to Low | Results order matches backend response |
| PLP-007 | P1 | Sort top rated | Select Top Rated | Results reload with rating sort |
| PLP-008 | P1 | Price filter | Apply min/max price range | Results match range and filter badge increments |
| PLP-009 | P1 | Rating filter | Apply minimum rating | Results match rating query |
| PLP-010 | P1 | In-stock filter | Toggle in-stock filter | Only in-stock products show if backend supports field |
| PLP-011 | P1 | Clear filters preserves category context | Open category list, apply filters, clear filters | User filters clear but category/vendor context remains |
| PLP-012 | P2 | Empty filtered result | Apply filter with no matches | Empty state appears with clear-filter action |
| PLP-013 | P2 | List fetch failure after data loaded | Force failure on pagination or filter change | Error is shown and previous safe state is not corrupted |

## Search

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| SEARCH-001 | P1 | Search by product name | Open Search, enter known query | Matching products render from `/products/search` |
| SEARCH-002 | P2 | Search validation/empty query | Submit blank query | App does not call search or shows prompt state |
| SEARCH-003 | P1 | Debounce or submit behavior | Type quickly | Requests are controlled and final query results are shown |
| SEARCH-004 | P1 | Search pagination | Scroll with more results | More results append without duplicates |
| SEARCH-005 | P2 | Search sort | Change sort if exposed | Results reload with selected sort |
| SEARCH-006 | P2 | Recent searches | Perform searches, leave and return | Recent searches persist locally and can be reused/cleared if UI exposes it |
| SEARCH-007 | P2 | No results | Search unknown term | Empty state appears without stale products |
| SEARCH-008 | P1 | Search API failure | Force search failure | Error state/snackbar appears with retry path |

## Product Detail

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| PDP-001 | P1 | Product detail loads | Open a valid product | Image gallery, name, category, stock badge, price, rating, vendor, tags, variants, description, and actions render |
| PDP-002 | P2 | Product loading/error states | Throttle/fail product API | Skeleton/error state appears; retry reloads |
| PDP-003 | P2 | Product without images | Open product without images if supported | Placeholder/gallery handles missing images without crash |
| PDP-004 | P1 | Variant selection changes price/stock | Select each variant | Display price and stock state update |
| PDP-005 | P1 | Add to cart | Select in-stock variant and tap Add to Cart | Cart updates and success/feedback appears |
| PDP-006 | P1 | Add to cart requires auth | Logged out, tap Add to Cart | User is redirected to login or prompted; no unauthorized mutation occurs |
| PDP-007 | P1 | Out-of-stock behavior | Open out-of-stock product/variant | Add to Cart is disabled or backend error is handled clearly |
| PDP-008 | P1 | Wishlist toggle | Tap wishlist icon | Product is added/removed and icon state updates |
| PDP-009 | P1 | Wishlist requires auth | Logged out, tap wishlist | User is redirected to login or prompted; no unauthorized mutation occurs |
| PDP-010 | P2 | Reviews navigation | Tap reviews section/action | Product reviews page opens for correct product |
| PDP-011 | P2 | Long product content | Seed long name, tags, description | Text wraps/truncates without overlap |

## Wishlist

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| WISH-001 | P1 | Wishlist loads | Open Wishlist | Saved products render with image/name/price/actions |
| WISH-002 | P1 | Add from product detail | Toggle product into wishlist, open Wishlist | Product appears |
| WISH-003 | P1 | Remove from wishlist page | Remove product | Product disappears and count/state updates |
| WISH-004 | P1 | Toggle removes existing product | Toggle already-wishlisted product from detail | Product is removed and icon updates |
| WISH-005 | P2 | Wishlist pagination | Seed more than one page and scroll | More items append without duplicates |
| WISH-006 | P2 | Empty wishlist | Use empty account or remove all items | Empty state appears with shopping action |
| WISH-007 | P1 | Wishlist API failure | Force list/toggle/remove failure | Error state/snackbar appears and prior state remains safe |

## Cart And Promo Preview

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| CART-001 | P1 | Cart loads | Open Cart with items | Items group by vendor, quantity controls, promo input, and summary render |
| CART-002 | P2 | Empty cart | Open Cart with no items | Empty cart state appears with shopping action |
| CART-003 | P1 | Add item from product detail | Add product variant to cart, open Cart | Item appears with correct variant, quantity, vendor, and price |
| CART-004 | P1 | Increase/decrease quantity | Use quantity controls | Item quantity and summary update from backend |
| CART-005 | P1 | Quantity boundary | Decrease quantity to minimum/zero depending on UI | Item is removed or minimum is enforced according to product rules |
| CART-006 | P1 | Remove item | Tap remove on cart item | Item disappears and totals update |
| CART-007 | P1 | Clear cart if exposed | Use clear action | Cart becomes empty after confirmation if confirmation exists |
| CART-008 | P1 | Valid promo preview | Enter active promo code | Discount preview appears and summary reflects preview |
| CART-009 | P1 | Invalid/expired promo | Enter invalid, expired, inactive, or min-order-failing code | Promo error appears and totals remain unchanged |
| CART-010 | P2 | Change cart after promo preview | Apply promo preview, then change quantity/remove item | Promo preview and totals refresh or clear consistently |
| CART-011 | P1 | Cart mutation failure with previous cart | Force update/remove failure after cart loaded | Error banner appears and previous cart remains visible |
| CART-012 | P1 | Proceed to checkout | Tap Proceed to Checkout with non-empty cart | Checkout page opens |

## Address Management

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| ADDR-001 | P1 | Address list loads | Open Addresses | Saved addresses render with default indicator and actions |
| ADDR-002 | P2 | Empty addresses | Use account with no addresses | Empty state appears with add action |
| ADDR-003 | P1 | Create address | Add valid full name, phone, street, city, state, country, zip | Address is created and appears in list |
| ADDR-004 | P1 | Required validation | Submit blank required fields | Inline validation blocks save |
| ADDR-005 | P1 | Phone validation | Submit invalid phone and valid phone | Invalid phone is blocked; valid phone saves |
| ADDR-006 | P1 | Zip validation | Submit invalid zip and valid zip | Invalid zip is blocked; valid zip saves |
| ADDR-007 | P1 | Edit address | Change fields and save | Address updates in list |
| ADDR-008 | P1 | Set default address | Set a non-default address as default | Selected address becomes default and previous default is cleared |
| ADDR-009 | P1 | Delete address cancel | Open delete confirmation and cancel | Address remains |
| ADDR-010 | P1 | Delete address success | Confirm delete | Address disappears; default handling remains valid |
| ADDR-011 | P1 | Delete default address | Delete default address | Backend/app chooses new default or shows clear state; no inconsistent default labels |
| ADDR-012 | P1 | Address API failure | Force create/update/delete/default failure | Error snackbar appears and previous list remains safe |

## Checkout And Payment

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| CHECK-001 | P0 | Checkout loads with cart | Open Checkout from non-empty cart | Address step, order summary, and price summary render |
| CHECK-002 | P1 | Checkout with empty cart | Open Checkout with empty cart or after cart cleared | App blocks checkout or returns to cart with clear message |
| CHECK-003 | P1 | Select existing address | Choose saved address | Address is selected and next/place-order action enables |
| CHECK-004 | P1 | Add address during checkout | Use add address form in checkout | Address is created and selectable without leaving checkout |
| CHECK-005 | P1 | Checkout address validation | Submit invalid add-address fields | Inline validation blocks save |
| CHECK-006 | P0 | Place order succeeds | Select address, valid cart, submit | Order is created and payment intent flow starts if required |
| CHECK-007 | P0 | Stripe payment succeeds | Complete payment with valid test card/config | User lands on checkout success page with order details |
| CHECK-008 | P0 | Payment intent creation fails | Force `/payments/create-intent` failure | Error appears; order/payment state is not ambiguous |
| CHECK-009 | P0 | Stripe confirmation fails/cancelled | Cancel/fail payment sheet | Error/cancel state appears and user can retry or return safely |
| CHECK-010 | P1 | Promo applied to order | Preview promo in cart, place order with promo | Order totals reflect promo according to backend |
| CHECK-011 | P1 | Inventory changes during checkout | Make item unavailable after cart load | Backend rejects checkout; app shows actionable error |
| CHECK-012 | P1 | Duplicate place-order prevention | Tap place-order repeatedly | Only one order/payment intent is created |
| CHECK-013 | P1 | Checkout success actions | From success page, tap view order/continue shopping if exposed | Correct destination opens |

## Order History And Detail

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| ORDER-001 | P1 | Order history loads | Open Orders | Orders render with order number, total, date, and status |
| ORDER-002 | P1 | Status filters | Select All, Pending, Confirmed, Shipped, Delivered, Cancelled | Orders match selected status and active tab updates |
| ORDER-003 | P1 | Order pagination | Scroll with more orders | More orders append without duplicates |
| ORDER-004 | P2 | Empty filtered orders | Select a status with no orders | Empty state appears without stale cards |
| ORDER-005 | P1 | Order detail loads | Tap an order | Detail page shows status timeline, items, address, and payment section |
| ORDER-006 | P1 | Cancel eligible order | Open pending/confirmed order, cancel with optional reason | Order becomes cancelled and timeline/badge update |
| ORDER-007 | P1 | Cancel ineligible order | Try cancel on shipped/delivered/cancelled/refunded order | Cancel action is hidden/disabled or backend error is handled |
| ORDER-008 | P1 | Cancel failure | Force cancel API failure | Error appears and order status remains unchanged |
| ORDER-009 | P2 | Detail 404 | Open deleted/inaccessible order detail URL | Error state appears and no private data leaks |
| ORDER-010 | P2 | Payment section formatting | Open paid, pending, failed/refunded orders | Payment status, method, and amounts display correctly |

## Reviews

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| REV-001 | P1 | Product reviews load | Open `/product/<id>/reviews` | Rating summary, breakdown, sort chips, filters, and reviews render |
| REV-002 | P1 | Review rating filter | Filter by each star rating | Results match selected rating and list resets to first page |
| REV-003 | P1 | Review sort | Select Newest, Highest, Lowest | Reviews reload in selected sort order |
| REV-004 | P2 | Reviews pagination | Scroll with more reviews | More reviews append without duplicates |
| REV-005 | P2 | Empty reviews | Open product with no reviews | Empty state appears |
| REV-006 | P1 | Write review requires auth | Logged out, open write-review route or action | User is redirected to login |
| REV-007 | P1 | Create review | Open write review, choose rating, add optional comment, submit | Review is created and appears in list |
| REV-008 | P1 | Rating validation | Submit review without selecting rating | Validation blocks submit |
| REV-009 | P1 | Update own review | Open write review with existing review, change rating/comment | Review updates and list reflects change |
| REV-010 | P1 | Clear optional comment | Edit review and clear comment | Comment is removed if backend permits it |
| REV-011 | P1 | Delete own review | Confirm delete from review list if action is exposed | Review disappears and rating totals update |
| REV-012 | P1 | Duplicate review blocked | Try creating a second review for same product if backend disallows it | Backend error appears and no duplicate review is shown |
| REV-013 | P2 | Reviews API failure | Force list/create/update/delete failure | Error state/snackbar appears and previous state remains safe |

## Notifications

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NOTIF-001 | P1 | Notifications load | Open Notifications | Notifications render with read/unread styling |
| NOTIF-002 | P2 | Empty notifications | Use account with no notifications | Empty state appears |
| NOTIF-003 | P1 | Unread count loads | Start app with unread notifications | Badge/count matches `/notifications/unread-count` |
| NOTIF-004 | P1 | Mark one as read | Tap unread notification or read action | Notification becomes read and count decrements |
| NOTIF-005 | P1 | Mark all as read | Tap mark-all action | All visible/unread notifications become read and count becomes zero |
| NOTIF-006 | P2 | Notifications pagination | Scroll with more notifications | More notifications append without duplicates |
| NOTIF-007 | P1 | FCM token save/remove | Login/logout with notification permissions configured | Token is saved on login/start and removed on logout where supported |
| NOTIF-008 | P2 | Notification API failure | Force list/read-count/read-all failure | Error state/snackbar appears and previous state remains safe |

## Settings And Theme

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| SET-001 | P1 | Settings page loads | Open Settings | Profile/settings options and logout action render |
| SET-002 | P2 | Theme toggle | Change theme setting if exposed | Theme updates immediately and persists after app restart |
| SET-003 | P1 | Logout confirmation cancel | Open logout confirmation, cancel | User remains logged in |
| SET-004 | P1 | Logout confirmation accept | Confirm logout | Tokens clear and protected routes require login |
| SET-005 | P2 | Theme storage failure | Simulate local theme storage failure | App falls back safely without crash |

## Network And API Resilience

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| NET-001 | P1 | Slow network | Throttle every major page | Skeleton/loading state appears; duplicate submits are prevented |
| NET-002 | P1 | Offline startup | Start app with API unavailable | Public/protected pages show actionable error, no crash |
| NET-003 | P1 | Malformed response | Return missing `data`, `items`, or `meta` | App shows friendly error state/snackbar |
| NET-004 | P0 | 401 from protected endpoint | Return 401 for cart/address/order/wishlist/notifications | Tokens clear and protected navigation redirects to login |
| NET-005 | P1 | 403 protected mutation | Return 403 on cart/order/review/wishlist mutation | Error appears and UI state is not corrupted |
| NET-006 | P2 | 404 product/order/review | Open deleted product/order/review route or mutate deleted item | Error state/snackbar appears without crash |
| NET-007 | P1 | Duplicate rapid clicks | Double-tap add-to-cart, place order, save address, write review | Only one mutation is submitted or duplicates are safely handled |
| NET-008 | P2 | Refresh while filtering | Pull refresh or retry after applying filters/search/status tabs | Request preserves intended query context and no stale mixed data appears |

## Security And Authorization

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| SEC-001 | P0 | Protected customer APIs require token | Remove token and call cart/address/order/wishlist/review-write | App redirects or errors safely; no private data appears |
| SEC-002 | P0 | User cannot access another user's orders/addresses | Attempt direct IDs for another user | Backend rejects; app shows error without exposing data |
| SEC-003 | P0 | Vendor/admin account behavior | Attempt customer app login with vendor/admin | Access follows product decision and protected customer mutations are not incorrectly authorized |
| SEC-004 | P1 | Banned customer session | Ban account externally, then refresh/use app | Access is denied according to backend rules and session is invalidated |
| SEC-005 | P1 | XSS-like text data | Seed product, review, notification, and address fields with `<script>` and HTML | Text displays safely as text, no script execution |
| SEC-006 | P1 | Price/promo/order tampering | Intercept checkout/cart payloads with manipulated totals or promo | Backend recalculates/rejects; app shows backend result safely |
| SEC-007 | P1 | Payment client secret handling | Inspect logs and UI during checkout | Client secret is not logged or displayed in user-visible UI |

## Accessibility And Usability

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| A11Y-001 | P2 | Screen reader labels | Inspect icon-only controls: back, wishlist, cart quantity, filter, sort, delete | Semantics/tooltip identify each action |
| A11Y-002 | P2 | Keyboard navigation | Use keyboard on web through auth forms, product list, cart, checkout, dialogs | Focus order is logical and all controls are reachable |
| A11Y-003 | P2 | Bottom sheet focus | Open filter/sort/address bottom sheets | Focus enters sheet and actions are reachable; dismiss works |
| A11Y-004 | P2 | Color contrast | Check badges, price text, status chips, errors, disabled buttons | Text meets readable contrast |
| A11Y-005 | P2 | Text scaling | Test 125%, 150%, 200% text scale | Product cards, cart rows, checkout forms, and order cards remain usable |
| A11Y-006 | P2 | Touch targets | Inspect small icons and quantity controls on phone | Tap targets are large enough and not too close together |

## Cross-Platform And Layout

| ID | Priority | Scenario | Steps | Expected Result |
|---|---:|---|---|---|
| UI-001 | P1 | iOS and Android phone layouts | Test common small/large devices | No clipped app bars, keyboard overlays, or unreachable bottom actions |
| UI-002 | P2 | Web desktop/tablet | Test Chrome/Safari/Firefox widths | Content remains readable; grids/lists adapt cleanly |
| UI-003 | P2 | Long content | Seed long names, descriptions, addresses, promo codes, notifications | Text wraps/truncates without breaking layout |
| UI-004 | P2 | Keyboard with forms | Focus auth/address/review fields on small screens | Active field and submit actions remain reachable |
| UI-005 | P3 | Empty states consistency | Force empty data in each module | Empty states use correct copy, spacing, and actions |
| UI-006 | P3 | Snackbar behavior | Trigger multiple errors quickly | Snackbars do not stack indefinitely or hide critical controls |

## Regression Smoke Suite

Run this after every customer app change:

1. Register a new customer and logout/login again.
2. Verify home loads banners, categories, trending products, and new arrivals.
3. Open a category product list, apply sort/filter, clear filters, and open a product.
4. Select a variant, add to cart, and toggle wishlist.
5. Search for a product and open a result.
6. Add/edit/set-default/delete an address.
7. Update cart quantity, remove an item, and preview valid/invalid promo codes.
8. Complete checkout with a test payment and verify checkout success.
9. Open order history, filter by status, open order detail, and cancel an eligible order.
10. Open product reviews, filter/sort, create or update a review, and delete if supported.
11. Open notifications, mark one read, and mark all read.
12. Toggle theme if exposed and verify persistence.
13. Trigger a forced 401 and confirm protected routes redirect to login.

## Automation Recommendations

- Add widget tests for auth forms, address forms, checkout add-address form, promo input, review form, and filter/sort bottom sheets.
- Add bloc/cubit tests for product list pagination/filter/sort, search, cart mutation with previous-cart fallback, checkout states, order filters, reviews, wishlist, and notifications.
- Add repository tests with mocked HTTP client for malformed payloads, pagination metadata, and error mapping.
- Add integration smoke tests for login, product-to-cart, checkout, order detail, and logout.
- Add screenshot/golden tests for home, product list/detail, cart, checkout, order detail, and address forms at phone and tablet widths.

## High-Risk Areas To Prioritize

- Checkout and payment intent state, especially duplicate order creation and failed/cancelled Stripe flows.
- Auth route rules where product detail/reviews are public but cart/checkout/review-write are protected.
- Cart totals, promo previews, and backend recalculation during checkout.
- Inventory/variant stock changes between product detail, cart, and checkout.
- Address default handling and deleting default addresses.
- Infinite scroll with filters/search/status tabs preserving correct query state.
- Token expiry during cart, checkout, order, wishlist, and notification mutations.
