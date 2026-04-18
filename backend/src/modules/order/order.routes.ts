import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireApprovedVendor } from '../../middleware/requireApprovedVendor';
import {
  validate,
  validateParams,
  validateQuery,
} from '../../middleware/validate';
import {
  createOrderSchema,
  getOrdersQuerySchema,
  orderParamSchema,
  cancelOrderSchema,
  vendorOrderParamSchema,
  updateVendorOrderStatusSchema,
  getVendorOrdersQuerySchema,
  vendorOrderIdParamSchema,
  updateVendorOrderStatusWithTrackingSchema,
} from './order.validation';
import { OrderController } from './order.controller';

const router = Router();
const orderController = new OrderController();

/**
 * @openapi
 * /orders/{id}/vendor-orders/{vendorOrderId}/status:
 *   put:
 *     tags: [Orders]
 *     summary: Update vendor sub-order status (Vendor only)
 *     description: Legacy endpoint. Prefer `/orders/vendor/{id}/status` for new integrations.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Parent order ID
 *       - in: path
 *         name: vendorOrderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Vendor order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, PROCESSING, SHIPPED, DELIVERED]
 *     responses:
 *       200:
 *         description: Status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR + approved status required
 *       404:
 *         description: Order not found
 */
router.put(
  '/:id/vendor-orders/:vendorOrderId/status',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateParams(vendorOrderParamSchema),
  validate(updateVendorOrderStatusSchema),
  orderController.updateVendorOrderStatus
);

/**
 * @openapi
 * /orders/vendor:
 *   get:
 *     tags: [Orders]
 *     summary: List vendor's orders (Vendor only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
 *     responses:
 *       200:
 *         description: Paginated vendor orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR + approved status required
 */
router.get(
  '/vendor',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(getVendorOrdersQuerySchema),
  orderController.listVendorOrders
);

/**
 * @openapi
 * /orders/vendor/{id}/status:
 *   put:
 *     tags: [Orders]
 *     summary: Update vendor order status with optional tracking (Vendor only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Vendor order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CONFIRMED, PROCESSING, SHIPPED, DELIVERED]
 *               trackingNumber:
 *                 type: string
 *                 example: "1Z999AA10123456784"
 *               trackingCarrier:
 *                 type: string
 *                 example: UPS
 *     responses:
 *       200:
 *         description: Vendor order status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR + approved status required
 *       404:
 *         description: Vendor order not found
 */
router.put(
  '/vendor/:id/status',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateParams(vendorOrderIdParamSchema),
  validate(updateVendorOrderStatusWithTrackingSchema),
  orderController.updateVendorOrderStatusWithTracking
);

// ── Customer-only: create, list, get, cancel ──
router.use(authenticate, authorize('CUSTOMER'));

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List the current customer's orders
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — CUSTOMER role required
 */
router.get('/', validateQuery(getOrdersQuerySchema), orderController.list);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order details by ID (Customer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.get('/:id', validateParams(orderParamSchema), orderController.getById);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   put:
 *     tags: [Orders]
 *     summary: Cancel an order (Customer only)
 *     description: Only orders in PENDING or CONFIRMED status can be cancelled.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: Changed my mind
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Order cannot be cancelled in its current status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
router.put(
  '/:id/cancel',
  validateParams(orderParamSchema),
  validate(cancelOrderSchema),
  orderController.cancel
);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place a new order (Customer only)
 *     description: Creates an order from the current cart items. Cart must be non-empty.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId]
 *             properties:
 *               addressId:
 *                 type: string
 *                 format: uuid
 *                 description: Saved address ID to ship to
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *               promoCode:
 *                 type: string
 *                 description: Optional promotional code
 *                 example: SUMMER20
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: Please leave at the front door
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error, empty cart, or invalid promo code
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 */
router.post('/', validate(createOrderSchema), orderController.create);

export default router;
