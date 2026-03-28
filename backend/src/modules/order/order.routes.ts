import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
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
} from './order.validation';
import { OrderController } from './order.controller';

const router = Router();
const orderController = new OrderController();

// ── Vendor-only: update vendor order status ──
router.put(
  '/:id/vendor-orders/:vendorOrderId/status',
  authenticate,
  authorize('VENDOR'),
  validateParams(vendorOrderParamSchema),
  validate(updateVendorOrderStatusSchema),
  orderController.updateVendorOrderStatus
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
