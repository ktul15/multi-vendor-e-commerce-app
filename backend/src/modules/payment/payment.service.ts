import type Stripe from 'stripe';
import { prisma } from '../../config/prisma';
import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { Currency, PaymentMethod } from '../../generated/prisma/client';
import { CreatePaymentIntentInput } from './payment.validation';
import { vendorPayoutService } from '../vendor-payout/vendor-payout.service';

// Stripe states where the client can still complete payment
const REUSABLE_INTENT_STATUSES: Stripe.PaymentIntent.Status[] = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
];

export class PaymentService {
    async createPaymentIntent(userId: string, input: CreatePaymentIntentInput) {
        const { orderId, currency } = input;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true },
        });

        if (!order) throw ApiError.notFound('Order not found');
        if (order.userId !== userId) throw ApiError.forbidden('Access denied');

        // Idempotency: return existing clientSecret for in-progress payments
        if (order.payment) {
            const { status, stripePaymentIntentId } = order.payment;

            if (status === 'PROCESSING') {
                const existing = await stripe.paymentIntents.retrieve(stripePaymentIntentId!);

                if (REUSABLE_INTENT_STATUSES.includes(existing.status)) {
                    return { clientSecret: existing.client_secret };
                }

                // Intent was cancelled on Stripe's side — fall through to create a fresh one
                // and update the existing Payment row instead of inserting a duplicate.
                const intent = await stripe.paymentIntents.create({
                    amount: Math.round(parseFloat(order.total.toString()) * 100),
                    currency: currency.toLowerCase(),
                    transfer_group: orderId,
                    metadata: { orderId, userId },
                });

                await prisma.payment.update({
                    where: { orderId },
                    data: { stripePaymentIntentId: intent.id, status: 'PROCESSING' },
                });

                return { clientSecret: intent.client_secret };
            }

            throw ApiError.conflict(`Payment for this order is already ${status.toLowerCase()}`);
        }

        // Multiply via string to avoid IEEE 754 floating-point imprecision on Decimal values
        const amountInCents = Math.round(parseFloat(order.total.toString()) * 100);

        const intent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency.toLowerCase(),
            transfer_group: orderId,
            metadata: { orderId, userId },
        });

        await prisma.payment.create({
            data: {
                orderId,
                amount: order.total,
                currency: currency as Currency,
                // Hardcoded to CARD for Stripe PaymentIntent flow; extend when wallet/COD support is added
                method: 'CARD' as PaymentMethod,
                status: 'PROCESSING',
                stripePaymentIntentId: intent.id,
            },
        });

        return { clientSecret: intent.client_secret };
    }

    async handleWebhook(rawBody: Buffer, signature: string) {
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
        } catch {
            throw ApiError.badRequest('Invalid webhook signature');
        }

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const intent = event.data.object as Stripe.PaymentIntent;
                const paymentMethodId =
                    typeof intent.payment_method === 'string'
                        ? intent.payment_method
                        : (intent.payment_method?.id ?? null);

                // Atomic: update Payment and all VendorOrders together
                await prisma.$transaction(async (tx) => {
                    const payment = await tx.payment.update({
                        where: { stripePaymentIntentId: intent.id },
                        data: {
                            status: 'SUCCEEDED',
                            paidAt: new Date(),
                            stripePaymentMethodId: paymentMethodId,
                        },
                        select: { orderId: true },
                    });

                    await tx.vendorOrder.updateMany({
                        where: { orderId: payment.orderId },
                        data: { status: 'CONFIRMED' },
                    });
                });

                // Create earnings records and initiate transfers to vendors
                await vendorPayoutService
                    .createTransfersForPayment(intent.id)
                    .catch((err) =>
                        logger.error('Failed to create vendor transfers:', err)
                    );
                break;
            }

            case 'payment_intent.payment_failed': {
                const intent = event.data.object as Stripe.PaymentIntent;
                await prisma.payment.update({
                    where: { stripePaymentIntentId: intent.id },
                    data: { status: 'FAILED' },
                });
                break;
            }

            default:
                logger.info(`Unhandled Stripe event: ${event.type}`);
                break;
        }
    }
}

export const paymentService = new PaymentService();
