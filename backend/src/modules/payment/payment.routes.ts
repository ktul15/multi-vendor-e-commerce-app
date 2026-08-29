import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { validateParams } from '../../middleware/validate';
import {
  confirmRazorpayPaymentSchema,
  createPaymentIntentSchema,
  createRefundSchema,
  paymentIdParamSchema,
} from './payment.validation';
import { PaymentController } from './payment.controller';

const router = Router();
export const paymentWebhookRouter = Router();
const paymentController = new PaymentController();

/**
 * @openapi
 * /payments/checkout:
 *   post:
 *     tags: [Payments]
 *     summary: Create a trusted provider checkout (Customer only)
 *     description: Selects Stripe or Razorpay from the persisted order and vendor configuration. Clients cannot choose the provider.
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
 *                 enum: [INR]
 *                 default: INR
 *     responses:
 *       201:
 *         description: Stripe PaymentIntent or Razorpay Order checkout created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Payment intent created
 *               data:
 *                 provider: RAZORPAY
 *                 providerOrderId: "order_test_123"
 *                 keyId: "rzp_test_123"
 *                 amount: 9999
 *                 currency: INR
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
  '/checkout',
  authenticate,
  authorize('CUSTOMER'),
  validate(createPaymentIntentSchema),
  paymentController.createIntent
);

/**
 * @openapi
 * /payments/razorpay/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Verify Razorpay Standard Checkout signature
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, providerOrderId, providerPaymentId, signature]
 *             properties:
 *               orderId: { type: string, format: uuid }
 *               providerOrderId: { type: string, maxLength: 100, example: "order_test_123" }
 *               providerPaymentId: { type: string, maxLength: 100, example: "pay_test_123" }
 *               signature:
 *                 type: string
 *                 pattern: "^[a-fA-F0-9]{64}$"
 *     responses:
 *       200: { description: Signature verified }
 *       400: { description: Invalid signature }
 */

// Deprecated compatibility alias for older storefront builds.
router.post(
  '/create-intent',
  authenticate,
  authorize('CUSTOMER'),
  validate(createPaymentIntentSchema),
  paymentController.createIntent
);

/**
 * @openapi
 * /payments/{paymentId}/refunds:
 *   post:
 *     tags: [Payments]
 *     summary: Create a full or partial provider refund (Admin only)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       description: Omit amount for a full remaining refund. Reason is optional.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: double
 *                 minimum: 0.01
 *                 multipleOf: 0.01
 *                 example: 49.99
 *               reason:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: Customer requested cancellation
 *     responses:
 *       200: { description: Refund initiated and audited }
 */

router.post(
  '/razorpay/confirm',
  authenticate,
  authorize('CUSTOMER'),
  validate(confirmRazorpayPaymentSchema),
  paymentController.confirmRazorpay
);

router.post(
  '/:paymentId/refunds',
  authenticate,
  authorize('ADMIN'),
  validateParams(paymentIdParamSchema),
  validate(createRefundSchema),
  paymentController.refund
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
 *       503:
 *         description: Local payment or refund is not visible yet; Stripe should retry the event
 */
// POST /api/v1/payments/webhook — public, Stripe-signed (no JWT auth)
paymentWebhookRouter.post('/webhook', paymentController.webhook);
paymentWebhookRouter.post('/webhooks/stripe', paymentController.webhook);

/**
 * @openapi
 * /payments/webhooks/razorpay:
 *   post:
 *     tags: [Payments]
 *     summary: Razorpay payment and Route webhook
 *     description: Verifies the raw-body signature and deduplicates X-Razorpay-Event-Id.
 *     security: []
 *     responses:
 *       200: { description: Event received or already processed }
 *       400: { description: Invalid signature or headers }
 *       503: { description: Local payment or refund is not visible yet; Razorpay should retry the event }
 */
paymentWebhookRouter.post(
  '/webhooks/razorpay',
  paymentController.razorpayWebhook
);

export default router;
