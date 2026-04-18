import { Router } from 'express';
import { PromoController } from './promo.controller';
import { authenticate, authorize } from '../../middleware/auth';
import {
  validate,
  validateParams,
  validateQuery,
} from '../../middleware/validate';
import { Role } from '../../generated/prisma/client';
import {
  createPromoSchema,
  updatePromoSchema,
  getPromosQuerySchema,
  promoIdParamSchema,
} from './promo.validation';

const router = Router();
const promoController = new PromoController();

// All promo admin routes require ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

/**
 * @openapi
 * /promo-codes:
 *   post:
 *     tags: [Promo Codes]
 *     summary: Create a promo code (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountType, discountValue]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 description: Automatically uppercased
 *                 example: SUMMER20
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               discountValue:
 *                 type: number
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *                 example: 20
 *               minOrderValue:
 *                 type: number
 *                 minimum: 0
 *                 example: 50
 *               maxDiscount:
 *                 type: number
 *                 minimum: 0
 *                 description: Maximum discount cap (used with PERCENTAGE type)
 *                 example: 30
 *               usageLimit:
 *                 type: integer
 *                 minimum: 1
 *                 description: Total number of times this code can be used
 *               perUserLimit:
 *                 type: integer
 *                 minimum: 1
 *                 description: Max uses per user
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Must be a future date
 *                 example: "2025-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Promo code created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       409:
 *         description: Promo code already exists
 */
router.post('/', validate(createPromoSchema), promoController.create);

/**
 * @openapi
 * /promo-codes:
 *   get:
 *     tags: [Promo Codes]
 *     summary: List promo codes (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by code (partial match)
 *       - in: query
 *         name: discountType
 *         schema:
 *           type: string
 *           enum: [PERCENTAGE, FIXED]
 *     responses:
 *       200:
 *         description: Paginated promo codes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', validateQuery(getPromosQuerySchema), promoController.getAll);

/**
 * @openapi
 * /promo-codes/{id}:
 *   get:
 *     tags: [Promo Codes]
 *     summary: Get a promo code by ID (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Promo code detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Promo code not found
 */
router.get('/:id', validateParams(promoIdParamSchema), promoController.getById);

/**
 * @openapi
 * /promo-codes/{id}:
 *   put:
 *     tags: [Promo Codes]
 *     summary: Update a promo code (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: At least one field required
 *             properties:
 *               code: { type: string }
 *               discountType: { type: string, enum: [PERCENTAGE, FIXED] }
 *               discountValue: { type: number }
 *               minOrderValue: { type: number }
 *               maxDiscount: { type: number }
 *               usageLimit: { type: integer }
 *               perUserLimit: { type: integer }
 *               isActive: { type: boolean }
 *               expiresAt: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Promo code updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Promo code not found
 */
router.put(
  '/:id',
  validateParams(promoIdParamSchema),
  validate(updatePromoSchema),
  promoController.update
);

/**
 * @openapi
 * /promo-codes/{id}:
 *   delete:
 *     tags: [Promo Codes]
 *     summary: Delete a promo code (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Promo code deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Promo code not found
 */
router.delete(
  '/:id',
  validateParams(promoIdParamSchema),
  promoController.delete
);

export default router;
