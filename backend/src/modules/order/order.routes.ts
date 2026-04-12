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

// ── Vendor-only: update vendor order status (legacy) ──
router.put(
  '/:id/vendor-orders/:vendorOrderId/status',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateParams(vendorOrderParamSchema),
  validate(updateVendorOrderStatusSchema),
  orderController.updateVendorOrderStatus
);

// ── Vendor-only: list vendor orders ──
router.get(
  '/vendor',
  authenticate,
  authorize('VENDOR'),
  requireApprovedVendor,
  validateQuery(getVendorOrdersQuerySchema),
  orderController.listVendorOrders
);

// ── Vendor-only: update vendor order status with tracking ──
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

router.get('/', validateQuery(getOrdersQuerySchema), orderController.list);
router.get('/:id', validateParams(orderParamSchema), orderController.getById);
router.put(
  '/:id/cancel',
  validateParams(orderParamSchema),
  validate(cancelOrderSchema),
  orderController.cancel
);
router.post('/', validate(createOrderSchema), orderController.create);

export default router;
