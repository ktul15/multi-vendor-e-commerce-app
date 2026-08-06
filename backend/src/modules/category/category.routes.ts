import { NextFunction, Request, Response, Router } from 'express';
import { CategoryController } from './category.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateParams } from '../../middleware/validate';
import upload, { withUpload } from '../../middleware/upload';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamSchema,
} from './category.validation';
import { Role } from '../../generated/prisma/client';
import { ApiError } from '../../utils/apiError';

const router = Router();
const categoryController = new CategoryController();

const requireCategoryUpdate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.file && Object.keys(req.body).length === 0) {
    next(
      ApiError.badRequest('At least one category field or image is required')
    );
    return;
  }
  next();
};

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories
 *     description: Returns every category as a recursively nested tree with no depth truncation. No authentication required.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               parentId: { type: string, format: uuid }
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional JPEG, PNG, or WebP image up to 5 MB. A file takes precedence over an image URL.
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
 *       404:
 *         description: Parent category not found
 *       413:
 *         description: Uploaded image exceeds the 5 MB limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post(
  '/',
  withUpload(upload.single('image')),
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
 *             minProperties: 1
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional replacement JPEG, PNG, or WebP image up to 5 MB.
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Invalid ID/payload, empty update, self-parent, or descendant cycle
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Category not found
 *       413:
 *         description: Uploaded image exceeds the 5 MB limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.put(
  '/:id',
  validateParams(categoryParamSchema),
  withUpload(upload.single('image')),
  validate(updateCategorySchema),
  requireCategoryUpdate,
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
 *       200:
 *         description: Category deleted
 *       400:
 *         description: Category has subcategories or attached products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ADMIN role required
 *       404:
 *         description: Category not found
 */
router.delete(
  '/:id',
  validateParams(categoryParamSchema),
  categoryController.deleteCategory
);

export default router;
