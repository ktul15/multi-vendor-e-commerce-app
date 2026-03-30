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

router.post('/', validate(createPromoSchema), promoController.create);

router.get('/', validateQuery(getPromosQuerySchema), promoController.getAll);

router.get('/:id', validateParams(promoIdParamSchema), promoController.getById);

router.put(
  '/:id',
  validateParams(promoIdParamSchema),
  validate(updatePromoSchema),
  promoController.update
);

router.delete(
  '/:id',
  validateParams(promoIdParamSchema),
  promoController.delete
);

export default router;
