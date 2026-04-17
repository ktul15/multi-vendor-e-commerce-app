import { Router } from 'express';
import { CategoryController } from './category.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { Role } from '../../generated/prisma/client';

const router = Router();
const categoryController = new CategoryController();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories
 *     description: Returns the full category tree. No authentication required.
 *     security: []
 *     responses:
 *       200:
 *         description: Category list
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Categories fetched
 *               data:
 *                 - id: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *                   name: Electronics
 *                   image: "https://cdn.example.com/electronics.jpg"
 *                   parentId: null
 *                   children:
 *                     - id: "e7b2c3a4-1234-5678-abcd-ef0123456789"
 *                       name: Phones
 *                       parentId: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 */
router.get('/', categoryController.getAllCategories);

// Admin only routes
router.use(authenticate, authorize(Role.ADMIN));

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Accessories
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: "https://cdn.example.com/accessories.jpg"
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the parent category (for subcategories)
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 */
router.post(
    '/',
    validate(createCategorySchema),
    categoryController.createCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Updated Name
 *               image:
 *                 type: string
 *                 format: uri
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Set to null to make it a root category
 *     responses:
 *       200:
 *         description: Category updated
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
 *       404:
 *         description: Category not found
 */
router.put(
    '/:id',
    validate(updateCategorySchema),
    categoryController.updateCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       204:
 *         description: Category deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Category not found
 */
router.delete(
    '/:id',
    categoryController.deleteCategory
);

export default router;
