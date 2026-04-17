import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateParams } from '../../middleware/validate';
import { addCartItemSchema, updateCartItemSchema, previewPromoSchema, itemIdParamSchema } from './cart.validation';

const router = Router();
const cartController = new CartController();

// All cart routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current user's cart
 *     responses:
 *       200:
 *         description: Cart with items
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Cart fetched
 *               data:
 *                 items:
 *                   - id: "item-uuid"
 *                     variantId: "variant-uuid"
 *                     quantity: 2
 *                     variant:
 *                       sku: "SKU-BLK-M"
 *                       price: 29.99
 *                       product:
 *                         name: Wireless Headphones
 *                 total: 59.98
 *       401:
 *         description: Unauthorized
 */
router.get('/', cartController.getCart);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add an item to the cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variantId, quantity]
 *             properties:
 *               variantId:
 *                 type: string
 *                 format: uuid
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       201:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Variant not found
 */
router.post('/items', validate(addCartItemSchema), cartController.addItem);

/**
 * @openapi
 * /cart/items/{itemId}:
 *   put:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cart item updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.put('/items/:itemId', validateParams(itemIdParamSchema), validate(updateCartItemSchema), cartController.updateItem);

/**
 * @openapi
 * /cart/items/{itemId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove an item from the cart
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item removed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.delete('/items/:itemId', validateParams(itemIdParamSchema), cartController.removeItem);

/**
 * @openapi
 * /cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear the entire cart
 *     responses:
 *       200:
 *         description: Cart cleared
 *       401:
 *         description: Unauthorized
 */
router.delete('/', cartController.clearCart);

/**
 * @openapi
 * /cart/preview-promo:
 *   post:
 *     tags: [Cart]
 *     summary: Preview a promo code discount on the current cart
 *     description: Calculates and returns the discounted total without placing an order.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: SUMMER20
 *     responses:
 *       200:
 *         description: Discount preview
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Promo applied
 *               data:
 *                 originalTotal: 100.00
 *                 discount: 20.00
 *                 finalTotal: 80.00
 *       400:
 *         description: Invalid or expired promo code
 *       401:
 *         description: Unauthorized
 */
router.post('/preview-promo', validate(previewPromoSchema), cartController.previewPromo);

export default router;
