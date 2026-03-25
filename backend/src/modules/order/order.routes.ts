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
} from './order.validation';
import { OrderController } from './order.controller';

const router = Router();
const orderController = new OrderController();

// CUSTOMER-only: orders are placed by end users.
// If admin order placement is needed in the future, widen to authorize('CUSTOMER', 'ADMIN').
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
