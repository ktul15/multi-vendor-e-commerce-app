import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createOrderSchema } from './order.validation';
import { OrderController } from './order.controller';

const router = Router();
const orderController = new OrderController();

// CUSTOMER-only: orders are placed by end users.
// If admin order placement is needed in the future, widen to authorize('CUSTOMER', 'ADMIN').
router.use(authenticate, authorize('CUSTOMER'));

router.post('/', validate(createOrderSchema), orderController.create);

export default router;
