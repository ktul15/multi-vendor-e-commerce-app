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

router.get(
    '/',
    validateQuery(getWishlistQuerySchema),
    wishlistController.getWishlist
);

router.post(
    '/',
    validate(toggleWishlistSchema),
    wishlistController.toggle
);

router.delete(
    '/:productId',
    validateParams(productIdParamSchema),
    wishlistController.remove
);

export default router;
