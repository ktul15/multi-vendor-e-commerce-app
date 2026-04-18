import { Router } from 'express';
import { WishlistController } from './wishlist.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateParams, validateQuery } from '../../middleware/validate';
import { Role } from '../../generated/prisma/client';
import {
    toggleWishlistSchema,
    productIdParamSchema,
    getWishlistQuerySchema,
} from './wishlist.validation';

const router = Router();
const wishlistController = new WishlistController();

router.use(authenticate, authorize(Role.CUSTOMER));

/**
 * @openapi
 * /wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get the customer's wishlist
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Paginated wishlist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — CUSTOMER role required
 */
router.get(
    '/',
    validateQuery(getWishlistQuerySchema),
    wishlistController.getWishlist
);

/**
 * @openapi
 * /wishlist:
 *   post:
 *     tags: [Wishlist]
 *     summary: Toggle a product in/out of the wishlist
 *     description: If the product is already in the wishlist it is removed; otherwise it is added.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *     responses:
 *       200:
 *         description: Product toggled in wishlist
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Added to wishlist
 *               data: { added: true }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post(
    '/',
    validate(toggleWishlistSchema),
    wishlistController.toggle
);

/**
 * @openapi
 * /wishlist/{productId}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a product from the wishlist
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not in wishlist
 */
router.delete(
    '/:productId',
    validateParams(productIdParamSchema),
    wishlistController.remove
);

export default router;
