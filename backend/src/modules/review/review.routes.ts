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

/**
 * @openapi
 * /reviews/product/{productId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews for a product
 *     security: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: rating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *         description: Filter by exact star rating
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest, lowest]
 *           default: newest
 *     responses:
 *       200:
 *         description: Paginated reviews for the product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       404:
 *         description: Product not found
 */
router.get(
    '/product/:productId',
    validateParams(productIdParamSchema),
    validateQuery(getReviewsQuerySchema),
    reviewController.getProductReviews
);

// Authenticated routes
router.use(authenticate);

/**
 * @openapi
 * /reviews/my-reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews written by the current user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of user's reviews
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/my-reviews',
    validateQuery(getMyReviewsQuerySchema),
    reviewController.getMyReviews
);

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a product review
 *     description: Users can only review products they have purchased.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, rating]
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 example: Great product, fast delivery!
 *     responses:
 *       201:
 *         description: Review created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error or already reviewed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post(
    '/',
    validate(createReviewSchema),
    reviewController.create
);

/**
 * @openapi
 * /reviews/{reviewId}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update a review
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one of rating or comment required
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Review updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — can only update your own reviews
 *       404:
 *         description: Review not found
 */
router.put(
    '/:reviewId',
    validateParams(reviewIdParamSchema),
    validate(updateReviewSchema),
    reviewController.update
);

/**
 * @openapi
 * /reviews/{reviewId}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Review deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — can only delete your own reviews
 *       404:
 *         description: Review not found
 */
router.delete(
    '/:reviewId',
    validateParams(reviewIdParamSchema),
    reviewController.delete
);

export default router;
