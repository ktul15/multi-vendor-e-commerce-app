import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticate } from '../../middleware/auth';
import { validate, validateParams, validateQuery } from '../../middleware/validate';
import {
    createReviewSchema,
    updateReviewSchema,
    reviewIdParamSchema,
    productIdParamSchema,
    getReviewsQuerySchema,
    getMyReviewsQuerySchema,
} from './review.validation';

const router = Router();
const reviewController = new ReviewController();

// Public routes
router.get(
    '/product/:productId',
    validateParams(productIdParamSchema),
    validateQuery(getReviewsQuerySchema),
    reviewController.getProductReviews
);

// Authenticated routes
router.use(authenticate);

router.get(
    '/my-reviews',
    validateQuery(getMyReviewsQuerySchema),
    reviewController.getMyReviews
);

router.post(
    '/',
    validate(createReviewSchema),
    reviewController.create
);

router.put(
    '/:reviewId',
    validateParams(reviewIdParamSchema),
    validate(updateReviewSchema),
    reviewController.update
);

router.delete(
    '/:reviewId',
    validateParams(reviewIdParamSchema),
    reviewController.delete
);

export default router;
