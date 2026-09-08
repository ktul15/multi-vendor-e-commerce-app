import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
  validate,
  validateQuery,
  validateParams,
} from '../../middleware/validate';
import { AdminController } from './admin.controller';
import {
  listUsersQuerySchema,
  listVendorsQuerySchema,
  listProductsQuerySchema,
  listOrdersQuerySchema,
  revenueQuerySchema,
  userIdParamSchema,
  vendorProfileIdParamSchema,
  productIdParamSchema,
  orderIdParamSchema,
  updateCommissionSchema,
  updateVendorCommissionSchema,
} from './admin.validation';

const router = Router();
const controller = new AdminController();

// All admin routes require a valid JWT and ADMIN role
router.use(authenticate, authorize('ADMIN'));

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard stats
 *     description: Returns platform-wide counts and platformRevenue, the platform's earned commission (not gross merchandise value).
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Dashboard stats fetched
 *               data:
 *                 totalUsers: 1200
 *                 totalVendors: 45
 *                 totalProducts: 320
 *                 totalOrders: 850
 *                 bannedUsers: 8
 *                 pendingVendors: 4
 *                 platformRevenue: "75000.00"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 */
// Dashboard
router.get('/dashboard', controller.getDashboard);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CUSTOMER, VENDOR, ADMIN]
 *       - in: query
 *         name: isBanned
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// User management
router.get('/users', validateQuery(listUsersQuerySchema), controller.listUsers);

/**
 * @openapi
 * /admin/users/{userId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a user by user ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User account ID, not a vendor-profile ID.
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User detail, including a vendor-profile summary when applicable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: User not found
 */
router.get(
  '/users/:userId',
  validateParams(userIdParamSchema),
  controller.getUserById
);

/**
 * @openapi
 * /admin/users/{userId}/ban:
 *   patch:
 *     tags: [Admin]
 *     summary: Ban a user (Admin only)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User banned
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin accounts cannot be banned, or ADMIN role is required
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already banned
 */
router.patch(
  '/users/:userId/ban',
  validateParams(userIdParamSchema),
  controller.banUser
);

/**
 * @openapi
 * /admin/users/{userId}/unban:
 *   patch:
 *     tags: [Admin]
 *     summary: Unban a user (Admin only)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User unbanned
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: User not found
 *       409:
 *         description: User is not currently banned
 */
router.patch(
  '/users/:userId/unban',
  validateParams(userIdParamSchema),
  controller.unbanUser
);

/**
 * @openapi
 * /admin/vendors:
 *   get:
 *     tags: [Admin]
 *     summary: List vendor profiles (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, SUSPENDED]
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive search by store name or owner email
 *     responses:
 *       200:
 *         description: Paginated vendor list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 */
// Vendor management
router.get(
  '/vendors',
  validateQuery(listVendorsQuerySchema),
  controller.listVendors
);

/**
 * @openapi
 * /admin/vendors/{vendorProfileId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a vendor by vendor-profile ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: vendorProfileId
 *         required: true
 *         description: VendorProfile ID. The owner user ID is returned separately as userId.
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor profile and relevant owner account detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Invalid vendor-profile ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Vendor profile not found
 */
router.get(
  '/vendors/:vendorProfileId',
  validateParams(vendorProfileIdParamSchema),
  controller.getVendorById
);

/**
 * @openapi
 * /admin/vendors/{vendorProfileId}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve a vendor (Admin only)
 *     parameters:
 *       - in: path
 *         name: vendorProfileId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor approved
 *       400:
 *         description: Invalid vendor-profile ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Vendor profile not found
 *       409:
 *         description: Vendor is already approved
 */
router.patch(
  '/vendors/:vendorProfileId/approve',
  validateParams(vendorProfileIdParamSchema),
  controller.approveVendor
);

/**
 * @openapi
 * /admin/vendors/{vendorProfileId}/reject:
 *   patch:
 *     tags: [Admin]
 *     summary: Reject a vendor application (Admin only)
 *     parameters:
 *       - in: path
 *         name: vendorProfileId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor rejected
 *       400:
 *         description: Invalid vendor-profile ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Vendor profile not found
 *       409:
 *         description: Vendor is already rejected or an approved vendor must be suspended instead
 */
router.patch(
  '/vendors/:vendorProfileId/reject',
  validateParams(vendorProfileIdParamSchema),
  controller.rejectVendor
);

/**
 * @openapi
 * /admin/vendors/{vendorProfileId}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspend an approved vendor (Admin only)
 *     parameters:
 *       - in: path
 *         name: vendorProfileId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor suspended
 *       400:
 *         description: Invalid vendor-profile ID, or vendor is not approved and cannot be suspended
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Vendor profile not found
 */
router.patch(
  '/vendors/:vendorProfileId/suspend',
  validateParams(vendorProfileIdParamSchema),
  controller.suspendVendor
);

/**
 * @openapi
 * /admin/vendors/{vendorProfileId}/commission:
 *   patch:
 *     tags: [Admin]
 *     summary: Set a vendor's custom commission rate (Admin only)
 *     parameters:
 *       - in: path
 *         name: vendorProfileId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rate]
 *             properties:
 *               rate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 nullable: true
 *                 description: Set null to revert to platform default
 *                 example: 12
 *     responses:
 *       200:
 *         description: Commission rate updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vendor profile not found
 */
router.patch(
  '/vendors/:vendorProfileId/commission',
  validateParams(vendorProfileIdParamSchema),
  validate(updateVendorCommissionSchema),
  controller.setVendorCommission
);

/**
 * @openapi
 * /admin/products:
 *   get:
 *     tags: [Admin]
 *     summary: List all products (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string, format: uuid }
 *         description: Vendor owner user-account ID (`User.id`), not the vendor-profile ID.
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 */
// Product moderation
router.get(
  '/products',
  validateQuery(listProductsQuerySchema),
  controller.listProducts
);

/**
 * @openapi
 * /admin/products/{productId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get complete product moderation detail (Admin only)
 *     description: Includes inactive products, media URLs, tags, variants and inventory, vendor and vendor-profile identity, category, and rating aggregates.
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product moderation detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Product not found
 */
router.get(
  '/products/:productId',
  validateParams(productIdParamSchema),
  controller.getProductById
);

/**
 * @openapi
 * /admin/products/{productId}/activate:
 *   patch:
 *     tags: [Admin]
 *     summary: Activate a product (Admin only)
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product activated
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product is already active
 */
router.patch(
  '/products/:productId/activate',
  validateParams(productIdParamSchema),
  controller.activateProduct
);

/**
 * @openapi
 * /admin/products/{productId}/deactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Deactivate a product (Admin only)
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product deactivated
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product is already inactive
 */
router.patch(
  '/products/:productId/deactivate',
  validateParams(productIdParamSchema),
  controller.deactivateProduct
);

/**
 * @openapi
 * /admin/products/{productId}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a product (Admin only)
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Product deleted; response body is empty
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Product not found
 *       409:
 *         description: Product has order history and must be deactivated instead
 */
router.delete(
  '/products/:productId',
  validateParams(productIdParamSchema),
  controller.deleteProduct
);

/**
 * @openapi
 * /admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all orders across the platform (Admin only)
 *     description: >
 *       Each order retains its per-vendor sub-orders and includes fulfillmentStatus. SINGLE means every
 *       sub-order has one shared status, MIXED means vendor statuses differ, and NONE indicates no sub-orders.
 *       Without vendorId, status matches an order when any sub-order has that status. With vendorId, both
 *       filters must match the same vendor sub-order.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *         description: Search by order number, customer name, or customer email
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Filter by customer ID
 *       - in: query
 *         name: vendorId
 *         schema: { type: string, format: uuid }
 *         description: Filter by vendor owner user-account ID (`User.id`), not the vendor-profile ID.
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Invalid pagination, date range, status, customer ID, or vendor user ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 */
// Orders
router.get(
  '/orders',
  validateQuery(listOrdersQuerySchema),
  controller.listAllOrders
);

/**
 * @openapi
 * /admin/orders/{orderId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get order detail (Admin only)
 *     description: Returns every vendor sub-order plus the deterministic SINGLE, MIXED, or NONE fulfillmentStatus summary.
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full order detail including sub-orders and items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Invalid order ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Order not found
 */
router.get(
  '/orders/:orderId',
  validateParams(orderIdParamSchema),
  controller.getOrderById
);

/**
 * @openapi
 * /admin/revenue:
 *   get:
 *     tags: [Admin]
 *     summary: Get gross merchandise value report (Admin only)
 *     description: Returns date-filtered INR GMV series plus authoritative gross, platform commission, vendor earnings, earning-status, and payout totals. Failed and reversed earnings are excluded from headline totals.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: month
 *     responses:
 *       200:
 *         description: Revenue report time series
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 */
// Revenue reports
router.get(
  '/revenue',
  validateQuery(revenueQuerySchema),
  controller.getPlatformRevenue
);

/**
 * @openapi
 * /admin/commission:
 *   get:
 *     tags: [Admin]
 *     summary: Get the platform default commission rate (Admin only)
 *     responses:
 *       200:
 *         description: Current default commission rate
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Default commission fetched
 *               data:
 *                 rate: 10
 *       401:
 *         description: Unauthorized
 */
// Commission settings
router.get('/commission', controller.getDefaultCommission);

/**
 * @openapi
 * /admin/commission:
 *   patch:
 *     tags: [Admin]
 *     summary: Update the platform default commission rate (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rate]
 *             properties:
 *               rate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 10
 *     responses:
 *       200:
 *         description: Commission rate updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/commission',
  validate(updateCommissionSchema),
  controller.setDefaultCommission
);

export default router;
