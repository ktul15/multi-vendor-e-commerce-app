import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate, validateQuery } from '../../middleware/validate';
import { createProductSchema, updateProductSchema, addVariantSchema, updateVariantSchema, getProductQuerySchema, searchProductQuerySchema } from './product.validation';
import { Role } from '../../generated/prisma/client';

const router = Router();
const productController = new ProductController();

// Public routes (Customers + Guests viewing the storefront)
router.get('/', validateQuery(getProductQuerySchema), productController.getProducts);
router.get('/search', validateQuery(searchProductQuerySchema), productController.searchProducts);
router.get('/:id', productController.getProductById);

// Vendor-only routes (Dashboard inventory management)
router.use(authenticate, authorize(Role.VENDOR));

router.post(
    '/',
    validate(createProductSchema),
    productController.createProduct
);

router.put(
    '/:id',
    validate(updateProductSchema),
    productController.updateProduct
);

router.delete(
    '/:id',
    productController.deleteProduct
);

// Variant Management
router.post(
    '/:id/variants',
    validate(addVariantSchema),
    productController.addVariant
);

router.put(
    '/:id/variants/:vid',
    validate(updateVariantSchema),
    productController.updateVariant
);

export default router;
