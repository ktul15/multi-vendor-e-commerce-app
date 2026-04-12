import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateParams } from '../../middleware/validate';
import { addCartItemSchema, updateCartItemSchema, previewPromoSchema, itemIdParamSchema } from './cart.validation';

const router = Router();
const cartController = new CartController();

// All cart routes require authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addItem);
router.put('/items/:itemId', validateParams(itemIdParamSchema), validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:itemId', validateParams(itemIdParamSchema), cartController.removeItem);
router.delete('/', cartController.clearCart);
router.post('/preview-promo', validate(previewPromoSchema), cartController.previewPromo);

export default router;
