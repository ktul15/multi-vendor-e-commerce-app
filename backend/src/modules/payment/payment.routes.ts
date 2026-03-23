import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPaymentIntentSchema } from './payment.validation';
import { PaymentController } from './payment.controller';

const router = Router();
const paymentController = new PaymentController();

// POST /api/v1/payments/create-intent — CUSTOMER only
router.post(
    '/create-intent',
    authenticate,
    authorize('CUSTOMER'),
    validate(createPaymentIntentSchema),
    paymentController.createIntent,
);

// POST /api/v1/payments/webhook — public, Stripe-signed (no JWT auth)
router.post('/webhook', paymentController.webhook);

export default router;
