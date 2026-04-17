import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPaymentIntentSchema } from './payment.validation';
import { PaymentController } from './payment.controller';

const router = Router();
const paymentController = new PaymentController();

/**
 * @openapi
 * /payments/create-intent:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Stripe PaymentIntent (Customer only)
 *     description: Creates a Stripe PaymentIntent for an order. The returned `clientSecret` is passed to Stripe's client-side SDK to complete payment.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, INR, CAD, AUD]
 *                 default: USD
 *     responses:
 *       201:
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Payment intent created
 *               data:
 *                 clientSecret: "pi_3OxY...secret_..."
 *                 amount: 9999
 *                 currency: usd
 *       400:
 *         description: Validation error or order not in payable state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — CUSTOMER role required
 *       404:
 *         description: Order not found
 */
// POST /api/v1/payments/create-intent — CUSTOMER only
router.post(
    '/create-intent',
    authenticate,
    authorize('CUSTOMER'),
    validate(createPaymentIntentSchema),
    paymentController.createIntent,
);

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Stripe payment webhook (Stripe servers only)
 *     description: >
 *       Receives Stripe-signed webhook events (e.g. `payment_intent.succeeded`).
 *       **Do not call this endpoint directly** — it is for Stripe's servers only.
 *       The raw request body is verified against `STRIPE_WEBHOOK_SECRET` via HMAC.
 *       This route is mounted before the global rate limiter so Stripe retries are never throttled.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe Event object
 *     responses:
 *       200:
 *         description: Event received and processed
 *       400:
 *         description: Invalid Stripe signature
 */
// POST /api/v1/payments/webhook — public, Stripe-signed (no JWT auth)
router.post('/webhook', paymentController.webhook);

export default router;
