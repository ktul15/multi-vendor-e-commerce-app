import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createProductSchema, updateProductSchema, addVariantSchema, updateVariantSchema, getProductQuerySchema, searchProductQuerySchema } from './product.validation';
import { Role } from '../../generated/prisma/client';

const router = Router();
const productController = new ProductController();

// Public routes (Customers + Guests viewing the storefront)
// NOTE: Literal routes (/search) must be registered before parameterised routes (/:id)
// so Express matches them first and does not treat "search" as a product ID.
// GET /         — general listing with all filters (search, price, category, vendor, rating, inStock, sort)
// GET /search   — search-first endpoint: keyword + pagination + sort only (simpler interface for search UX)
// GET /:id      — single product by ID

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with filters
 *     description: General product listing with full filtering, sorting, and pagination. No auth required.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price_asc, price_desc, rating, popular]
 *           default: newest
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Full-text search on product name/description
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: rating
 *         schema: { type: number, minimum: 0, maximum: 5 }
 *         description: Minimum average rating filter
 *       - in: query
 *         name: inStock
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Products fetched
 *               data:
 *                 products: []
 *                 meta:
 *                   total: 50
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 5
 */
router.get('/', validateQuery(getProductQuerySchema), productController.getProducts);

/**
 * @openapi
 * /products/search:
 *   get:
 *     tags: [Products]
 *     summary: Search products by keyword
 *     description: Simplified search endpoint — keyword + pagination + sort only. No auth required.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search keyword
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price_asc, price_desc, rating, popular]
 *           default: newest
 *     responses:
 *       200:
 *         description: Matching products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Missing required query param `q`
 */
router.get('/search', validateQuery(searchProductQuerySchema), productController.searchProducts);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       404:
 *         description: Product not found
 */
router.get('/:id', productController.getProductById);

// Vendor-only routes (Dashboard inventory management)
router.use(authenticate, authorize(Role.VENDOR));

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product (Vendor only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, name, description, basePrice]
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: Wireless Headphones
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 example: Premium noise-cancelling wireless headphones
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *                 example: 99.99
 *               images:
 *                 type: array
 *                 items: { type: string, format: uri }
 *                 maxItems: 5
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *                 example: [electronics, audio]
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [sku, price]
 *                   properties:
 *                     sku: { type: string, example: "SKU-BLK-M" }
 *                     size: { type: string, example: M }
 *                     color: { type: string, example: Black }
 *                     price: { type: number, minimum: 0, example: 99.99 }
 *                     stock: { type: integer, minimum: 0, example: 50 }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR role required
 */
router.post(
    '/',
    validate(createProductSchema),
    productController.createProduct
);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product (Vendor only)
 *     description: Vendor can only update their own products.
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
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string, minLength: 2 }
 *               description: { type: string, minLength: 10 }
 *               basePrice: { type: number, minimum: 0 }
 *               images:
 *                 type: array
 *                 items: { type: string, format: uri }
 *                 maxItems: 5
 *               isActive: { type: boolean }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Product updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.put(
    '/:id',
    validate(updateProductSchema),
    productController.updateProduct
);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (Vendor only)
 *     description: Vendor can only delete their own products.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Product deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
router.delete(
    '/:id',
    productController.deleteProduct
);

/**
 * @openapi
 * /products/{id}/variants:
 *   post:
 *     tags: [Products]
 *     summary: Add a variant to a product (Vendor only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, price]
 *             properties:
 *               sku: { type: string, example: "SKU-RED-L" }
 *               size: { type: string, example: L }
 *               color: { type: string, example: Red }
 *               price: { type: number, minimum: 0, example: 29.99 }
 *               stock: { type: integer, minimum: 0, default: 0, example: 100 }
 *     responses:
 *       201:
 *         description: Variant added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — VENDOR role required
 *       404:
 *         description: Product not found
 */
router.post(
    '/:id/variants',
    validate(addVariantSchema),
    productController.addVariant
);

/**
 * @openapi
 * /products/{id}/variants/{vid}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product variant (Vendor only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Product ID
 *       - in: path
 *         name: vid
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Variant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku: { type: string }
 *               size: { type: string, nullable: true }
 *               color: { type: string, nullable: true }
 *               price: { type: number, minimum: 0 }
 *               stock: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Variant updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product or variant not found
 */
router.put(
    '/:id/variants/:vid',
    validate(updateVariantSchema),
    productController.updateVariant
);

export default router;
