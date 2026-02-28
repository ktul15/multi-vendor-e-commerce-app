#!/bin/bash
# =============================================================
# Batch create GitHub Issues, Labels, and Milestones
# for the Multi-Vendor E-Commerce App
#
# Prerequisites:
#   brew install gh
#   gh auth login
#
# Usage:
#   chmod +x scripts/create-github-issues.sh
#   ./scripts/create-github-issues.sh
# =============================================================

set -e

REPO="ktul15/multi-vendor-e-commerce-app"

echo "🏷️  Creating labels..."

gh label create "backend"         --repo $REPO --color "0E8A16" --description "Node.js / Express API work" --force
gh label create "storefront"      --repo $REPO --color "0075CA" --description "Flutter mobile storefront" --force
gh label create "vendor-dash"     --repo $REPO --color "F9D0C4" --description "Flutter web vendor dashboard" --force
gh label create "admin-dash"      --repo $REPO --color "C5DEF5" --description "Flutter web admin dashboard" --force
gh label create "feature"         --repo $REPO --color "A2EEEF" --description "New feature" --force
gh label create "setup"           --repo $REPO --color "FBCA04" --description "Project setup / config" --force
gh label create "auth"            --repo $REPO --color "E4E669" --description "Authentication related" --force
gh label create "payments"        --repo $REPO --color "B60205" --description "Stripe / payment related" --force
gh label create "database"        --repo $REPO --color "5319E7" --description "Schema / Prisma / PostgreSQL" --force
gh label create "testing"         --repo $REPO --color "BFD4F2" --description "Tests" --force
gh label create "devops"          --repo $REPO --color "D4C5F9" --description "CI/CD, Docker, deployment" --force
gh label create "ui/ux"           --repo $REPO --color "FF69B4" --description "Design & styling" --force
gh label create "priority:high"   --repo $REPO --color "B60205" --description "Must-have" --force
gh label create "priority:medium" --repo $REPO --color "FBCA04" --description "Should-have" --force
gh label create "priority:low"    --repo $REPO --color "0E8A16" --description "Nice-to-have" --force

echo "✅ Labels created!"
echo ""
echo "📅 Creating milestones..."

gh api repos/$REPO/milestones -f title="M1 — Foundation" -f due_on="2026-03-14T23:59:59Z" -f description="Project setup, auth, core infrastructure"
gh api repos/$REPO/milestones -f title="M2 — Products & Catalog" -f due_on="2026-03-28T23:59:59Z" -f description="Product CRUD, categories, search"
gh api repos/$REPO/milestones -f title="M3 — Cart & Checkout" -f due_on="2026-04-11T23:59:59Z" -f description="Cart, addresses, Stripe payments"
gh api repos/$REPO/milestones -f title="M4 — Orders & Tracking" -f due_on="2026-04-18T23:59:59Z" -f description="Order management, status tracking"
gh api repos/$REPO/milestones -f title="M5 — Engagement" -f due_on="2026-04-25T23:59:59Z" -f description="Reviews, wishlist, notifications"
gh api repos/$REPO/milestones -f title="M6 — Vendor Dashboard" -f due_on="2026-05-09T23:59:59Z" -f description="Vendor features, Stripe Connect"
gh api repos/$REPO/milestones -f title="M7 — Admin Dashboard" -f due_on="2026-05-23T23:59:59Z" -f description="Admin panel, platform management"
gh api repos/$REPO/milestones -f title="M8 — Polish & Launch" -f due_on="2026-06-06T23:59:59Z" -f description="Testing, dark mode, deployment"

echo "✅ Milestones created!"
echo ""
echo "📝 Creating issues..."

# ========================================
# M1 — Foundation
# ========================================

gh issue create --repo $REPO --title "Initialize Node.js + Express + TypeScript project" \
  --label "backend,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Set up the backend project scaffold with TypeScript.

**Acceptance Criteria:**
- [ ] Express + TypeScript + ts-node-dev configured
- [ ] Folder structure: src/config, middleware, modules, utils, types
- [ ] ESLint + Prettier with TypeScript rules
- [ ] \`npm run dev\` starts the server on port 5000
- [ ] Health check route \`GET /api/health\` returns 200
- [ ] \`.env.example\` with all required env vars
- [ ] tsconfig.json with strict mode"

gh issue create --repo $REPO --title "Set up PostgreSQL + Prisma ORM" \
  --label "backend,database,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Configure PostgreSQL with Prisma.

**Acceptance Criteria:**
- [ ] Prisma initialized with \`prisma init\`
- [ ] DATABASE_URL via environment variable
- [ ] Initial \`schema.prisma\` with User model
- [ ] \`npx prisma migrate dev\` creates initial migration
- [ ] \`npx prisma generate\` generates typed client
- [ ] Prisma client singleton in \`src/config/prisma.ts\`
- [ ] Seed script for initial admin user"

gh issue create --repo $REPO --title "Create User model & Prisma schema" \
  --label "backend,database,auth,priority:high" --milestone "M1 — Foundation" \
  --body "Define User in Prisma schema.

**Acceptance Criteria:**
- [ ] Fields: id (uuid), name, email (unique), password, role (enum: CUSTOMER, VENDOR, ADMIN), avatar, fcmToken, isVerified, isBanned, createdAt, updatedAt
- [ ] Role enum in Prisma
- [ ] Password hashing utility (bcrypt) in service layer
- [ ] Migration generated and applied"

gh issue create --repo $REPO --title "Implement JWT auth middleware" \
  --label "backend,auth,priority:high" --milestone "M1 — Foundation" \
  --body "JWT-based authentication with access + refresh tokens.

**Acceptance Criteria:**
- [ ] \`generateAccessToken()\` — 15min expiry
- [ ] \`generateRefreshToken()\` — 7d expiry
- [ ] \`auth\` middleware extracts & verifies Bearer token
- [ ] Attaches \`req.user\` with typed payload (userId, role)
- [ ] Returns 401 for invalid/expired tokens
- [ ] TypeScript interfaces for JWT payload"

gh issue create --repo $REPO --title "Implement role-based authorization middleware" \
  --label "backend,auth,priority:high" --milestone "M1 — Foundation" \
  --body "Restrict endpoints by user role.

**Acceptance Criteria:**
- [ ] \`authorize(...roles: Role[])\` middleware factory
- [ ] Returns 403 if user role not in allowed list
- [ ] Works in combination with auth middleware
- [ ] Type-safe role enum usage"

gh issue create --repo $REPO --title "Build auth routes (register, login, refresh, forgot/reset password, logout)" \
  --label "backend,auth,feature,priority:high" --milestone "M1 — Foundation" \
  --body "Complete authentication flow.

**Acceptance Criteria:**
- [ ] \`POST /api/v1/auth/register\` — create user, hash password, return tokens
- [ ] \`POST /api/v1/auth/login\` — validate credentials, return tokens
- [ ] \`POST /api/v1/auth/refresh-token\` — issue new access token
- [ ] \`POST /api/v1/auth/forgot-password\` — send OTP via email (Redis)
- [ ] \`POST /api/v1/auth/reset-password\` — verify OTP & update password
- [ ] \`GET /api/v1/auth/me\` — return current user
- [ ] \`PUT /api/v1/auth/me\` — update profile
- [ ] \`POST /api/v1/auth/logout\` — invalidate refresh token
- [ ] Zod validation on all routes"

gh issue create --repo $REPO --title "Create global error handler & API response helpers" \
  --label "backend,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Standardize error handling and API responses.

**Acceptance Criteria:**
- [ ] \`ApiError\` class with statusCode, message, errors array
- [ ] \`ApiResponse\` class with statusCode, data, message
- [ ] Global error handler middleware
- [ ] Prisma error handler (unique constraint, not found, etc.)
- [ ] 404 handler for undefined routes
- [ ] Async handler wrapper"

gh issue create --repo $REPO --title "Set up request validation with Zod" \
  --label "backend,setup,priority:medium" --milestone "M1 — Foundation" \
  --body "Centralized request validation with TypeScript inference.

**Acceptance Criteria:**
- [ ] \`validate\` middleware that accepts a Zod schema
- [ ] Validates \`req.body\`, \`req.query\`, \`req.params\`
- [ ] Returns structured 400 errors with field-level messages
- [ ] Zod schema types inferred in controllers"

gh issue create --repo $REPO --title "Configure Redis for session & OTP storage" \
  --label "backend,setup,priority:medium" --milestone "M1 — Foundation" \
  --body "Redis integration for caching and OTP storage.

**Acceptance Criteria:**
- [ ] Redis connection in \`src/config/redis.ts\` (ioredis)
- [ ] Helpers: \`setOTP()\`, \`getOTP()\`, \`deleteOTP()\`
- [ ] TTL-based expiry for OTPs (5 min)
- [ ] Refresh token blacklisting on logout"

gh issue create --repo $REPO --title "Set up rate limiting" \
  --label "backend,setup,priority:medium" --milestone "M1 — Foundation" \
  --body "Rate limit auth and sensitive endpoints.

**Acceptance Criteria:**
- [ ] Rate limiter middleware using \`express-rate-limit\`
- [ ] Auth routes: 5 requests/15 min per IP
- [ ] General API: 100 requests/15 min per IP
- [ ] Redis store for distributed rate limiting"

gh issue create --repo $REPO --title "Initialize Storefront Flutter project (mobile)" \
  --label "storefront,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Scaffold the customer-facing Flutter mobile app.

**Acceptance Criteria:**
- [ ] \`flutter create --org com.ktul15 storefront\`
- [ ] Folder structure: core/, features/, shared/
- [ ] flutter_bloc + bloc added and configured
- [ ] GoRouter with initial routes
- [ ] App runs on iOS and Android"

gh issue create --repo $REPO --title "Create shared theme system (storefront)" \
  --label "storefront,ui/ux,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Design system with colors, typography, spacing.

**Acceptance Criteria:**
- [ ] Light and dark ThemeData defined
- [ ] Custom color palette
- [ ] Google Fonts integration (Inter)
- [ ] Text styles (h1-h6, body, caption)
- [ ] Spacing & radius constants"

gh issue create --repo $REPO --title "Set up Dio HTTP client with interceptors (storefront)" \
  --label "storefront,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Centralized API client.

**Acceptance Criteria:**
- [ ] Dio instance with base URL config
- [ ] Auth interceptor (auto-attach JWT)
- [ ] Token refresh interceptor (auto-refresh on 401)
- [ ] Error interceptor
- [ ] Logging interceptor (debug mode only)"

gh issue create --repo $REPO --title "Build auth screens (storefront)" \
  --label "storefront,auth,feature,ui/ux,priority:high" --milestone "M1 — Foundation" \
  --body "Authentication UI with Bloc integration.

**Acceptance Criteria:**
- [ ] Login screen with email/password
- [ ] Sign Up screen
- [ ] Forgot Password screen (email → OTP → new password)
- [ ] Form validation
- [ ] Loading states and error snackbars
- [ ] Secure token storage (flutter_secure_storage)
- [ ] Auto-login if valid token exists
- [ ] AuthBloc with events: Login, Register, ForgotPassword, ResetPassword, Logout"

gh issue create --repo $REPO --title "Initialize Vendor Dashboard Flutter project (web)" \
  --label "vendor-dash,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Scaffold the vendor-facing Flutter web app.

**Acceptance Criteria:**
- [ ] \`flutter create --org com.ktul15 --platforms web vendor_dashboard\`
- [ ] Folder structure: core/, features/, shared/
- [ ] flutter_bloc configured
- [ ] GoRouter with initial routes
- [ ] Responsive sidebar layout for web
- [ ] App runs on Chrome"

gh issue create --repo $REPO --title "Initialize Admin Dashboard Flutter project (web)" \
  --label "admin-dash,setup,priority:high" --milestone "M1 — Foundation" \
  --body "Scaffold the admin-facing Flutter web app.

**Acceptance Criteria:**
- [ ] \`flutter create --org com.ktul15 --platforms web admin_dashboard\`
- [ ] Folder structure: core/, features/, shared/
- [ ] flutter_bloc configured
- [ ] GoRouter with initial routes
- [ ] Responsive sidebar layout for web
- [ ] Admin login screen
- [ ] App runs on Chrome"

gh issue create --repo $REPO --title "Build vendor login screen (vendor dashboard)" \
  --label "vendor-dash,auth,feature,ui/ux,priority:high" --milestone "M1 — Foundation" \
  --body "Vendor authentication for the web dashboard.

**Acceptance Criteria:**
- [ ] Login screen with email/password
- [ ] Only allows vendor role to proceed
- [ ] Token storage (shared_preferences for web)
- [ ] AuthBloc for vendor dashboard
- [ ] Redirect to dashboard on success"

# ========================================
# M2 — Products & Catalog
# ========================================

gh issue create --repo $REPO --title "Create Prisma schema for categories, products, variants" \
  --label "backend,database,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Category: id (uuid), name, slug (unique), image, parentId (self-reference)
- [ ] Product: id, vendorId, categoryId, name, description, basePrice, images[], isActive, avgRating, reviewCount, tags[]
- [ ] Variant: id, productId, size, color, price, stock, sku (unique)
- [ ] Relations with proper foreign keys
- [ ] Migration generated and applied
- [ ] Indexes on: categoryId, vendorId"

gh issue create --repo $REPO --title "Build Category CRUD API" \
  --label "backend,feature,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] \`GET /api/v1/categories\` — list all (nested tree)
- [ ] \`POST /api/v1/categories\` — create (admin only)
- [ ] \`PUT /api/v1/categories/:id\` — update (admin only)
- [ ] \`DELETE /api/v1/categories/:id\` — delete (admin only)
- [ ] Auto-generate slug from name
- [ ] Zod validation"

gh issue create --repo $REPO --title "Build Product CRUD API" \
  --label "backend,feature,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] \`POST /api/v1/products\` — create (vendor only)
- [ ] \`PUT /api/v1/products/:id\` — update (vendor, owner only)
- [ ] \`DELETE /api/v1/products/:id\` — soft delete
- [ ] \`POST /api/v1/products/:id/variants\` — add variant
- [ ] \`PUT /api/v1/products/:id/variants/:vid\` — update variant
- [ ] Image upload to Cloudinary (max 5)
- [ ] Prisma transactions for product + variants"

gh issue create --repo $REPO --title "Build product listing API with filters, sort & pagination" \
  --label "backend,feature,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] \`GET /api/v1/products\` — paginated list
- [ ] Filter by: category, priceMin, priceMax, rating, vendor, inStock
- [ ] Sort by: price_asc, price_desc, newest, rating, popular
- [ ] Offset pagination with total count
- [ ] \`GET /api/v1/products/:id\` — detail with variants
- [ ] \`GET /api/v1/products/search?q=\` — full-text search"

gh issue create --repo $REPO --title "Set up Cloudinary image upload middleware" \
  --label "backend,setup,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Multer middleware for multipart file handling
- [ ] Cloudinary SDK configured
- [ ] Upload helper: accepts buffer, returns URL + publicId
- [ ] Delete helper: removes image by publicId
- [ ] File size limit (5MB) and type validation"

gh issue create --repo $REPO --title "Build Home screen (storefront)" \
  --label "storefront,feature,ui/ux,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Promotional banner carousel (auto-scroll)
- [ ] Category grid (icons + names)
- [ ] Trending products horizontal list
- [ ] New Arrivals section
- [ ] Pull-to-refresh
- [ ] Skeleton loaders
- [ ] HomeCubit/HomeBloc"

gh issue create --repo $REPO --title "Build Product List screen (storefront)" \
  --label "storefront,feature,ui/ux,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Grid/list toggle
- [ ] Filter bottom sheet (category, price range, rating)
- [ ] Sort dropdown
- [ ] Infinite scroll pagination
- [ ] Product card: image, name, price, rating, vendor
- [ ] ProductListBloc"

gh issue create --repo $REPO --title "Build Product Detail screen (storefront)" \
  --label "storefront,feature,ui/ux,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Image carousel with zoom
- [ ] Product info (name, price, description)
- [ ] Variant selector (size, color) with stock status
- [ ] Add to Cart button
- [ ] Add to Wishlist heart icon
- [ ] Reviews preview
- [ ] Vendor info card"

gh issue create --repo $REPO --title "Build Search screen (storefront)" \
  --label "storefront,feature,ui/ux,priority:medium" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Debounced search bar (300ms)
- [ ] Auto-suggest dropdown
- [ ] Recent searches (local storage)
- [ ] Search results grid
- [ ] Empty state"

gh issue create --repo $REPO --title "Build Category management screens (admin dashboard)" \
  --label "admin-dash,feature,ui/ux,priority:high" --milestone "M2 — Products & Catalog" \
  --body "**Acceptance Criteria:**
- [ ] Category data table
- [ ] Add/edit form (name, parent dropdown, image upload)
- [ ] Delete with confirmation
- [ ] Nested category tree view"

# ========================================
# M3 — Cart & Checkout
# ========================================

gh issue create --repo $REPO --title "Create Prisma schema for cart, address, order, payment, promo codes" \
  --label "backend,database,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] Cart, CartItem, Address, Order, OrderItem, Payment, PromoCode models
- [ ] All enums (OrderStatus, PaymentStatus, etc.)
- [ ] Proper relations and unique constraints
- [ ] Migration generated and applied"

gh issue create --repo $REPO --title "Build Cart API" \
  --label "backend,feature,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] \`GET /api/v1/cart\` — get cart with product/variant includes
- [ ] \`POST /api/v1/cart/items\` — add item (upsert)
- [ ] \`PUT /api/v1/cart/items/:itemId\` — update quantity
- [ ] \`DELETE /api/v1/cart/items/:itemId\` — remove item
- [ ] \`DELETE /api/v1/cart\` — clear cart
- [ ] \`POST /api/v1/cart/apply-promo\` — validate & apply
- [ ] Stock validation on add/update"

gh issue create --repo $REPO --title "Build Address API" \
  --label "backend,feature,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] CRUD for addresses
- [ ] Only one \`isDefault\` per user (Prisma transaction)
- [ ] Zod validation"

gh issue create --repo $REPO --title "Build Order creation API" \
  --label "backend,feature,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] \`POST /api/v1/orders\` — create from cart
- [ ] Validate stock, calculate totals
- [ ] Decrement stock (Prisma transaction)
- [ ] Clear cart after order
- [ ] Generate order number (ORD-YYYYMMDD-XXXX)"

gh issue create --repo $REPO --title "Integrate Stripe payment (PaymentIntent + webhook)" \
  --label "backend,payments,feature,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] \`POST /api/v1/payments/create-intent\` — create PaymentIntent
- [ ] Returns \`clientSecret\`
- [ ] \`POST /api/v1/payments/webhook\` — handle succeeded/failed events
- [ ] Webhook signature verification
- [ ] Idempotency handling"

gh issue create --repo $REPO --title "Build Cart screen (storefront)" \
  --label "storefront,feature,ui/ux,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] Items grouped by vendor
- [ ] Quantity controls, remove, swipe-to-delete
- [ ] Cart summary, promo code input
- [ ] Proceed to Checkout button
- [ ] Empty cart state
- [ ] CartBloc"

gh issue create --repo $REPO --title "Build Checkout flow (storefront)" \
  --label "storefront,feature,payments,ui/ux,priority:high" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] Step 1: Select/add address
- [ ] Step 2: Order summary
- [ ] Step 3: Stripe Payment Sheet
- [ ] Success screen with animation
- [ ] Error handling
- [ ] CheckoutBloc"

gh issue create --repo $REPO --title "Build Address management screens (storefront)" \
  --label "storefront,feature,ui/ux,priority:medium" --milestone "M3 — Cart & Checkout" \
  --body "**Acceptance Criteria:**
- [ ] Address list with default badge
- [ ] Add/edit form
- [ ] Set as default, delete with confirmation
- [ ] Reusable address card widget"

# ========================================
# M4 — Orders & Tracking
# ========================================

gh issue create --repo $REPO --title "Build Order history & detail API" \
  --label "backend,feature,priority:high" --milestone "M4 — Orders & Tracking" \
  --body "**Acceptance Criteria:**
- [ ] \`GET /api/v1/orders\` — paginated order history
- [ ] \`GET /api/v1/orders/:id\` — detail with includes
- [ ] \`PUT /api/v1/orders/:id/cancel\` — cancel + restore stock
- [ ] Stripe refund initiation on cancel"

gh issue create --repo $REPO --title "Build Order History screen (storefront)" \
  --label "storefront,feature,ui/ux,priority:high" --milestone "M4 — Orders & Tracking" \
  --body "**Acceptance Criteria:**
- [ ] Order cards with status badges
- [ ] Filter tabs: All, Active, Completed, Cancelled
- [ ] Pull-to-refresh + pagination
- [ ] OrderListBloc"

gh issue create --repo $REPO --title "Build Order Detail with status timeline (storefront)" \
  --label "storefront,feature,ui/ux,priority:high" --milestone "M4 — Orders & Tracking" \
  --body "**Acceptance Criteria:**
- [ ] Status timeline: Placed → Confirmed → Shipped → Delivered
- [ ] Items list, address, payment info
- [ ] Cancel Order button
- [ ] Tracking number with copy"

gh issue create --repo $REPO --title "Implement push notifications (FCM)" \
  --label "backend,storefront,feature,priority:medium" --milestone "M4 — Orders & Tracking" \
  --body "**Acceptance Criteria:**
- [ ] Backend: FCM integration, Notification model, send on status change
- [ ] Backend: \`GET /api/v1/notifications\`, mark read endpoints
- [ ] Storefront: FCM setup, save token on login
- [ ] Storefront: Notification center with badge count"

# ========================================
# M5 — Engagement
# ========================================

gh issue create --repo $REPO --title "Create Prisma schema for reviews & wishlist" \
  --label "backend,database,priority:medium" --milestone "M5 — Engagement" \
  --body "**Acceptance Criteria:**
- [ ] Review: id, userId, productId, rating, comment, createdAt
- [ ] Unique: one review per user per product
- [ ] WishlistItem: id, userId, productId, createdAt
- [ ] Unique: userId + productId
- [ ] Migration applied"

gh issue create --repo $REPO --title "Build Reviews API" \
  --label "backend,feature,priority:medium" --milestone "M5 — Engagement" \
  --body "**Acceptance Criteria:**
- [ ] GET, POST, PUT, DELETE for reviews
- [ ] Must have purchased to review
- [ ] Auto-update product avgRating and reviewCount"

gh issue create --repo $REPO --title "Build Wishlist API" \
  --label "backend,feature,priority:medium" --milestone "M5 — Engagement" \
  --body "**Acceptance Criteria:**
- [ ] GET wishlist with product details
- [ ] POST toggle add/remove
- [ ] DELETE explicit remove"

gh issue create --repo $REPO --title "Build Promo Code engine" \
  --label "backend,feature,priority:medium" --milestone "M5 — Engagement" \
  --body "**Acceptance Criteria:**
- [ ] Admin CRUD for promo codes
- [ ] Validate & apply at cart level
- [ ] Percentage or flat discount
- [ ] Usage tracking per user"

gh issue create --repo $REPO --title "Build Reviews, Wishlist, Notifications UI (storefront)" \
  --label "storefront,feature,ui/ux,priority:medium" --milestone "M5 — Engagement" \
  --body "**Acceptance Criteria:**
- [ ] Review list with star breakdown
- [ ] Write/edit review screen
- [ ] Wishlist screen with Move to Cart
- [ ] Notification center
- [ ] Badge count on bell icon"

# ========================================
# M6 — Vendor Dashboard
# ========================================

gh issue create --repo $REPO --title "Create VendorProfile Prisma schema" \
  --label "backend,database,vendor-dash,priority:high" --milestone "M6 — Vendor Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] VendorProfile: id, userId (unique), storeName, storeLogo, storeBanner, description, status enum, stripeAccountId, bankDetails (json)
- [ ] Relation to User
- [ ] Migration applied"

gh issue create --repo $REPO --title "Build Vendor profile & store setup API" \
  --label "backend,vendor-dash,feature,priority:high" --milestone "M6 — Vendor Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] GET & PUT vendor profile
- [ ] Image uploads for logo/banner
- [ ] Status = PENDING on registration
- [ ] Only approved vendors can access endpoints"

gh issue create --repo $REPO --title "Build vendor order management API" \
  --label "backend,vendor-dash,feature,priority:high" --milestone "M6 — Vendor Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] \`GET /api/v1/orders/vendor\` — vendor's orders
- [ ] \`PUT /api/v1/orders/vendor/:id/status\` — update status with tracking
- [ ] Filter by status
- [ ] Email notification to customer"

gh issue create --repo $REPO --title "Integrate Stripe Connect for vendor payouts" \
  --label "backend,vendor-dash,payments,feature,priority:high" --milestone "M6 — Vendor Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Stripe Connect onboarding
- [ ] Connect webhook handling
- [ ] Earnings & payout endpoints
- [ ] Configurable commission deduction"

gh issue create --repo $REPO --title "Build vendor analytics API" \
  --label "backend,vendor-dash,feature,priority:medium" --milestone "M6 — Vendor Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Sales data (daily/weekly/monthly — Prisma groupBy)
- [ ] Top 5 products, total orders/revenue
- [ ] Date range filtering"

gh issue create --repo $REPO --title "Build Vendor Dashboard screens (Flutter web)" \
  --label "vendor-dash,feature,ui/ux,priority:high" --milestone "M6 — Vendor Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Dashboard overview: sales cards, recent orders, revenue chart
- [ ] Store setup/edit screen
- [ ] Product management: data table, CRUD forms
- [ ] Order management: data table, status updates
- [ ] Earnings page with charts (fl_chart)
- [ ] Sidebar navigation
- [ ] Responsive layout"

# ========================================
# M7 — Admin Dashboard
# ========================================

gh issue create --repo $REPO --title "Build admin API endpoints" \
  --label "backend,admin-dash,feature,priority:high" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] \`GET /api/v1/admin/dashboard\` — platform stats
- [ ] User management: list, ban/unban
- [ ] Vendor management: pending list, approve/reject
- [ ] Product moderation: list, approve/flag/remove
- [ ] All orders with filters
- [ ] Revenue reports (Prisma aggregate)
- [ ] Commission rate settings"

gh issue create --repo $REPO --title "Build admin banner & promo code API" \
  --label "backend,admin-dash,feature,priority:medium" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Banner model: id, title, imageUrl, linkUrl, position, isActive
- [ ] Banner CRUD (admin only)
- [ ] \`GET /api/v1/banners\` — public endpoint for storefront
- [ ] PromoCode CRUD (admin only)"

gh issue create --repo $REPO --title "Build Admin Dashboard overview screen" \
  --label "admin-dash,feature,ui/ux,priority:high" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Stat cards: users, vendors, orders, revenue
- [ ] Revenue chart (line, daily/weekly/monthly)
- [ ] Recent orders table
- [ ] Pending vendor count badge
- [ ] Sidebar navigation"

gh issue create --repo $REPO --title "Build User Management screens (admin)" \
  --label "admin-dash,feature,ui/ux,priority:high" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Users data table with search & role filter
- [ ] Ban/unban toggle with confirmation
- [ ] User detail view"

gh issue create --repo $REPO --title "Build Vendor Approval screens (admin)" \
  --label "admin-dash,feature,ui/ux,priority:high" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Pending vendors list with store details
- [ ] Approve/reject with reason
- [ ] All vendors list (tabs by status)
- [ ] Vendor detail: store info, products, sales"

gh issue create --repo $REPO --title "Build Product Moderation screens (admin)" \
  --label "admin-dash,feature,ui/ux,priority:medium" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Products data table with status filter
- [ ] Approve/flag/remove actions
- [ ] Product detail preview"

gh issue create --repo $REPO --title "Build Order & Finance screens (admin)" \
  --label "admin-dash,feature,ui/ux,priority:medium" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] All orders data table
- [ ] Order detail view
- [ ] Revenue reports, commission settings
- [ ] Date range selector"

gh issue create --repo $REPO --title "Build Banner & Promo Code management (admin)" \
  --label "admin-dash,feature,ui/ux,priority:medium" --milestone "M7 — Admin Dashboard" \
  --body "**Acceptance Criteria:**
- [ ] Banners: list, add, edit, delete, reorder
- [ ] Promo codes: list, add, edit, toggle, delete
- [ ] Banner preview"

# ========================================
# M8 — Polish & Launch
# ========================================

gh issue create --repo $REPO --title "Add skeleton loaders & empty states (all Flutter apps)" \
  --label "storefront,vendor-dash,admin-dash,ui/ux,priority:medium" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Shimmer loaders on all list/detail screens
- [ ] Empty state illustrations
- [ ] Error state with Retry button
- [ ] Apply to all three apps"

gh issue create --repo $REPO --title "Implement dark mode (storefront)" \
  --label "storefront,ui/ux,priority:medium" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Dark theme matching design system
- [ ] System default / manual toggle
- [ ] Persisted preference
- [ ] All screens render correctly"

gh issue create --repo $REPO --title "Write backend unit & integration tests" \
  --label "backend,testing,priority:high" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Jest with TypeScript
- [ ] Unit tests for: auth, order, payment services
- [ ] Integration tests for: auth, product, cart, order routes
- [ ] Test database setup
- [ ] Coverage 70%+
- [ ] \`npm test\` runs all"

gh issue create --repo $REPO --title "Write Flutter widget & unit tests" \
  --label "storefront,testing,priority:medium" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Unit tests for: AuthBloc, CartBloc, API client
- [ ] Widget tests for: login, product card, cart
- [ ] \`flutter test\` runs all
- [ ] Coverage 60%+"

gh issue create --repo $REPO --title "Docker + CI/CD setup" \
  --label "backend,devops,priority:medium" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Backend Dockerfile (multi-stage build)
- [ ] docker-compose.yml (backend + PostgreSQL + Redis)
- [ ] GitHub Actions: lint → test → build on PR
- [ ] Deploy workflow on merge to main"

gh issue create --repo $REPO --title "API documentation (Swagger/OpenAPI)" \
  --label "backend,priority:medium" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Swagger UI at \`/api/docs\`
- [ ] All endpoints documented
- [ ] Auth headers documented
- [ ] Example requests"

gh issue create --repo $REPO --title "App icon, splash screen & deep linking (storefront)" \
  --label "storefront,ui/ux,priority:medium" --milestone "M8 — Polish & Launch" \
  --body "**Acceptance Criteria:**
- [ ] Custom app icon (flutter_launcher_icons)
- [ ] Native splash screen (flutter_native_splash)
- [ ] Deep linking for: product detail, order detail"

echo ""
echo "🎉 All done! 65 issues created across 8 milestones."
echo ""
echo "👉 View issues: https://github.com/$REPO/issues"
echo "👉 Create a Project board: https://github.com/users/ktul15/projects"
echo ""
echo "Recommended board columns: Backlog → To Do → In Progress → In Review → Done"
