import { Router } from 'express';
import { CategoryController } from './category.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCategorySchema, updateCategorySchema } from './category.validation';
import { Role } from '../../generated/prisma/client';

const router = Router();
const categoryController = new CategoryController();

// Public routes
router.get('/', categoryController.getAllCategories);

// Admin only routes
router.use(authenticate, authorize(Role.ADMIN));

router.post(
    '/',
    validate(createCategorySchema),
    categoryController.createCategory
);

router.put(
    '/:id',
    validate(updateCategorySchema),
    categoryController.updateCategory
);

router.delete(
    '/:id',
    categoryController.deleteCategory
);

export default router;
