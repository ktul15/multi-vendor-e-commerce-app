import type Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { stripe } from '../../config/stripe';
import {
  Currency,
  PaymentMethod,
  PaymentProvider,
  Prisma,
} from '../../generated/prisma/client';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { vendorPayoutService } from '../vendor-payout/vendor-payout.service';
import { allocateVendorPayments } from './payment-allocation';
import { CreatePaymentIntentInput } from './payment.validation';
import { CheckoutRequest } from './providers/payment-gateway';
import { paymentGatewayFor } from './providers/payment-gateway.registry';
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from './providers/razorpay.gateway';

type RazorpayWebhook = Readonly<{
  account_id?: string;
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    transfer?: { entity?: Record<string, unknown> };
    refund?: { entity?: Record<string, unknown> };
    settlement?: { entity?: Record<string, unknown> };
  };
}>;

const amountMinor = (value: { toString(): string }): number =>
  Math.round(Number(value.toString()) * 100);
const CHECKOUT_LEASE_MS = 2 * 60 * 1000;
const REFUND_PROVIDER_LEASE_MS = 2 * 60 * 1000;
const REVERSAL_LEASE_MS = 5 * 60 * 1000;

const providerReferenceFor = (payment: {
  provider: PaymentProvider;
  providerOrderId: string | null;
  providerPaymentId: string | null;
}): string | null =>
  payment.provider === 'RAZORPAY'
    ? payment.providerOrderId
    : payment.providerPaymentId;

export class PaymentService {
  async createCheckout(userId: string, input: CreatePaymentIntentInput) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        payment: true,
        vendorOrders: {
          include: {
            vendor: { include: { vendorProfile: true } },
          },
        },
      },
    });

    if (!order) throw ApiError.notFound('Order not found');
    if (order.userId !== userId) throw ApiError.forbidden('Access denied');
    if (order.vendorOrders.length === 0) {
      throw ApiError.badRequest('Order has no vendor allocations');
    }

    for (const vendorOrder of order.vendorOrders) {
      const profile = vendorOrder.vendor.vendorProfile;
      if (!profile || profile.paymentProvider !== order.paymentProvider) {
        throw ApiError.conflict(
          'Vendor payment configuration changed; recreate the order'
        );
      }
      if (
        !profile.providerAccountId ||
        profile.paymentOnboardingStatus !== 'COMPLETE'
      ) {
        throw ApiError.conflict(
          `Vendor ${vendorOrder.vendorId} has not completed ${order.paymentProvider} onboarding`
        );
      }
    }

    if (order.payment && order.payment.status !== 'PROCESSING') {
      throw ApiError.conflict(
        `Payment for this order is already ${order.payment.status.toLowerCase()}`
      );
    }

    const defaultRate = await this.defaultCommissionRate();
    const allocations = allocateVendorPayments(
      amountMinor(order.total),
      order.vendorOrders.map((vendorOrder) => ({
        vendorOrderId: vendorOrder.id,
        subtotalMinor: amountMinor(vendorOrder.subtotal),
        commissionRate:
          vendorOrder.vendor.vendorProfile?.commissionRate === null ||
          vendorOrder.vendor.vendorProfile?.commissionRate === undefined
            ? defaultRate
            : Number(
                vendorOrder.vendor.vendorProfile.commissionRate.toString()
              ),
      }))
    );

    const earnings = await prisma.$transaction(
      allocations.map((allocation) => {
        const vendorOrder = order.vendorOrders.find(
          (item) => item.id === allocation.vendorOrderId
        )!;
        return prisma.vendorEarning.upsert({
          where: { vendorOrderId: allocation.vendorOrderId },
          create: {
            vendorProfileId: vendorOrder.vendor.vendorProfile!.id,
            vendorOrderId: allocation.vendorOrderId,
            orderId: order.id,
            grossAmount: (allocation.grossMinor / 100).toFixed(2),
            commissionRate: allocation.commissionRate,
            commissionAmount: (allocation.commissionMinor / 100).toFixed(2),
            netAmount: (allocation.netMinor / 100).toFixed(2),
            currency: Currency.INR,
            status: 'PENDING',
          },
          update: {},
        });
      })
    );

    const address = order.shippingAddress as {
      fullName: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
    let reservation: Awaited<ReturnType<PaymentService['reserveCheckout']>>;
    try {
      reservation = await this.reserveCheckout(order.id, {
        provider: order.paymentProvider,
        amount: order.total,
      });
    } catch (error) {
      if (
        ['P2002', 'P2034'].includes((error as { code?: string }).code ?? '')
      ) {
        throw ApiError.conflict('Checkout creation is already in progress');
      }
      throw error;
    }
    const request: CheckoutRequest = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      idempotencyKey: reservation.paymentId,
      userId,
      amountMinor: amountMinor(order.total),
      currency: 'INR',
      description: `Order ${order.orderNumber}`,
      shipping: {
        name: address.fullName,
        phone: address.phone,
        address: {
          line1: address.street,
          city: address.city,
          state: address.state,
          country: address.country,
          postalCode: address.zipCode,
        },
      },
      transfers: allocations.map((allocation) => {
        const vendorOrder = order.vendorOrders.find(
          (item) => item.id === allocation.vendorOrderId
        )!;
        const earning = earnings.find(
          (item) => item.vendorOrderId === allocation.vendorOrderId
        )!;
        return {
          accountId: vendorOrder.vendor.vendorProfile!.providerAccountId || '',
          amountMinor: allocation.netMinor,
          earningId: earning.id,
          vendorOrderId: vendorOrder.id,
        };
      }),
    };

    const gateway = paymentGatewayFor(order.paymentProvider);
    let checkout = null;
    try {
      if (reservation.providerReference) {
        checkout = await gateway.reuseCheckout(
          reservation.providerReference,
          request
        );
      }
      checkout ??= await gateway.createCheckout(request);
    } catch (error) {
      await this.releaseCheckoutLease(
        reservation.paymentId,
        reservation.leaseToken
      );
      throw error;
    }

    const identifiers =
      checkout.provider === 'STRIPE'
        ? {
            providerOrderId: null,
            providerPaymentId: checkout.providerPaymentId,
          }
        : {
            providerOrderId: checkout.providerOrderId,
            providerPaymentId: null,
          };

    const stored = await prisma.payment.updateMany({
      where: {
        id: reservation.paymentId,
        checkoutLeaseToken: reservation.leaseToken,
        status: 'PROCESSING',
      },
      data: {
        ...identifiers,
        checkoutLeaseExpiresAt: null,
        checkoutLeaseToken: null,
      },
    });
    if (stored.count !== 1) {
      throw ApiError.conflict('Checkout lease expired; retry this checkout');
    }

    if (checkout.provider === 'RAZORPAY') {
      await prisma.$transaction(
        checkout.transfers.map((transfer) =>
          prisma.vendorEarning.update({
            where: { id: transfer.earningId },
            data: { providerTransferId: transfer.transferId },
          })
        )
      );
    }

    return checkout;
  }

  // Backwards-compatible service name while clients migrate to /checkout.
  async createPaymentIntent(userId: string, input: CreatePaymentIntentInput) {
    return this.createCheckout(userId, input);
  }

  async confirmRazorpayPayment(
    userId: string,
    input: {
      orderId: string;
      providerOrderId: string;
      providerPaymentId: string;
      signature: string;
    }
  ) {
    const payment = await prisma.payment.findFirst({
      where: { orderId: input.orderId, order: { userId } },
      include: { order: true },
    });
    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.provider !== 'RAZORPAY') {
      throw ApiError.badRequest('Order is not assigned to Razorpay');
    }
    if (payment.providerOrderId !== input.providerOrderId) {
      throw ApiError.badRequest('Razorpay order does not match this order');
    }
    if (
      !verifyRazorpayPaymentSignature({
        orderId: input.providerOrderId,
        paymentId: input.providerPaymentId,
        signature: input.signature,
      })
    ) {
      throw ApiError.badRequest('Invalid Razorpay payment signature');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: input.providerPaymentId },
    });
    if (env.RAZORPAY_SANDBOX_MOCK) {
      await this.markPaymentSucceeded(payment.id, input.providerPaymentId);
    }
    return { verified: true, sandbox: env.RAZORPAY_SANDBOX_MOCK };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      throw ApiError.badRequest('Invalid Stripe webhook signature');
    }
    if (!(await this.claimWebhook('STRIPE', event.id, event.type))) {
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent;
        await vendorPayoutService.createTransfersForPayment(intent.id);
      }
      return;
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await prisma.payment.findFirst({
          where: { provider: 'STRIPE', providerPaymentId: intent.id },
        });
        if (payment) {
          await this.markPaymentSucceeded(
            payment.id,
            intent.id,
            typeof intent.payment_method === 'string'
              ? intent.payment_method
              : (intent.payment_method?.id ?? null)
          );
          await vendorPayoutService.createTransfersForPayment(intent.id);
        } else {
          await this.releaseWebhook('STRIPE', event.id);
          throw ApiError.serviceUnavailable(
            'Payment is not locally visible yet; retry the webhook'
          );
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.payment.updateMany({
          where: {
            provider: 'STRIPE',
            providerPaymentId: intent.id,
            status: { not: 'SUCCEEDED' },
          },
          data: { status: 'FAILED' },
        });
      } else if (
        event.type === 'refund.updated' ||
        event.type === 'refund.failed'
      ) {
        const providerRefund = event.data.object as Stripe.Refund;
        const receipt = providerRefund.metadata?.receipt;
        const refund = await prisma.paymentRefund.findFirst({
          where: {
            provider: 'STRIPE',
            OR: [
              { providerRefundId: providerRefund.id },
              ...(receipt ? [{ id: receipt }] : []),
            ],
          },
        });
        if (refund && providerRefund.status === 'succeeded') {
          await prisma.paymentRefund.update({
            where: { id: refund.id },
            data: {
              providerRefundId: providerRefund.id,
              status: 'SUCCEEDED',
              providerLeaseToken: null,
              providerLeaseExpiresAt: null,
              failureReason: null,
            },
          });
          await this.finalizeSucceededRefund(refund.id);
        } else if (
          refund &&
          ['failed', 'canceled'].includes(providerRefund.status ?? '')
        ) {
          await prisma.paymentRefund.update({
            where: { id: refund.id },
            data: {
              providerRefundId: providerRefund.id,
              status: 'FAILED',
              providerLeaseToken: null,
              providerLeaseExpiresAt: null,
              failureReason: 'Stripe refund failed',
            },
          });
        } else if (!refund) {
          await this.releaseWebhook('STRIPE', event.id);
          throw ApiError.serviceUnavailable(
            'Refund is not locally visible yet; retry the webhook'
          );
        }
      } else {
        logger.info(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      await this.releaseWebhook('STRIPE', event.id);
      throw error;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    return this.handleStripeWebhook(rawBody, signature);
  }

  async handleRazorpayWebhook(
    rawBody: Buffer,
    signature: string,
    eventId: string
  ) {
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      throw ApiError.badRequest('Invalid Razorpay webhook signature');
    }
    let event: RazorpayWebhook;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhook;
    } catch {
      throw ApiError.badRequest('Invalid Razorpay webhook payload');
    }
    if (!event.event) throw ApiError.badRequest('Missing Razorpay event type');
    if (!(await this.claimWebhook('RAZORPAY', eventId, event.event))) return;

    try {
      const paymentEntity = event.payload?.payment?.entity;
      const transferEntity = event.payload?.transfer?.entity;
      const refundEntity = event.payload?.refund?.entity;
      const settlementEntity = event.payload?.settlement?.entity;
      if (event.event === 'payment.captured' && paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        if (typeof orderId === 'string' && typeof paymentId === 'string') {
          const payment = await prisma.payment.findFirst({
            where: { provider: 'RAZORPAY', providerOrderId: orderId },
          });
          if (payment) {
            await this.markPaymentSucceeded(payment.id, paymentId);
          } else {
            await this.releaseWebhook('RAZORPAY', eventId);
            throw ApiError.serviceUnavailable(
              'Payment is not locally visible yet; retry the webhook'
            );
          }
        }
      } else if (event.event === 'payment.failed' && paymentEntity) {
        const orderId = paymentEntity.order_id;
        if (typeof orderId === 'string') {
          await prisma.payment.updateMany({
            where: {
              provider: 'RAZORPAY',
              providerOrderId: orderId,
              status: { not: 'SUCCEEDED' },
            },
            data: { status: 'FAILED' },
          });
        }
      } else if (event.event === 'transfer.processed' && transferEntity) {
        const transferId = transferEntity.id;
        if (typeof transferId === 'string') {
          await prisma.vendorEarning.updateMany({
            where: { providerTransferId: transferId },
            data: { status: 'TRANSFERRED', transferredAt: new Date() },
          });
        }
      } else if (
        ['transfer.failed', 'transfers.failed'].includes(event.event) &&
        transferEntity
      ) {
        const transferId = transferEntity.id;
        if (typeof transferId === 'string') {
          await prisma.vendorEarning.updateMany({
            where: { providerTransferId: transferId },
            data: { status: 'FAILED' },
          });
        }
      } else if (event.event === 'transfer.reversed' && transferEntity) {
        const transferId = transferEntity.id;
        if (typeof transferId === 'string') {
          const earning = await prisma.vendorEarning.findUnique({
            where: { providerTransferId: transferId },
          });
          const providerReversedMinor = transferEntity.amount_reversed;
          if (earning && typeof providerReversedMinor === 'number') {
            const fullNetMinor = amountMinor(earning.netAmount);
            const reconciledMinor = Math.max(
              amountMinor(earning.reversedAmount),
              Math.min(fullNetMinor, providerReversedMinor)
            );
            await prisma.vendorEarning.update({
              where: { id: earning.id },
              data: {
                reversedAmount: (reconciledMinor / 100).toFixed(2),
                status:
                  reconciledMinor >= fullNetMinor ? 'REVERSED' : earning.status,
              },
            });
          }
        }
      } else if (
        ['refund.processed', 'refund.failed'].includes(event.event) &&
        refundEntity
      ) {
        const refundId = refundEntity.id;
        if (typeof refundId === 'string') {
          const receipt = refundEntity.receipt;
          const notes = refundEntity.notes;
          const refundRecordId =
            notes && typeof notes === 'object'
              ? (notes as Record<string, unknown>).refundRecordId
              : undefined;
          const localIds = [receipt, refundRecordId].filter(
            (value): value is string => typeof value === 'string'
          );
          const refund = await prisma.paymentRefund.findFirst({
            where: {
              provider: 'RAZORPAY',
              OR: [
                { providerRefundId: refundId },
                ...localIds.map((id) => ({ id })),
              ],
            },
          });
          if (refund && event.event === 'refund.processed') {
            await prisma.paymentRefund.update({
              where: { id: refund.id },
              data: {
                providerRefundId: refundId,
                status: 'SUCCEEDED',
                providerLeaseToken: null,
                providerLeaseExpiresAt: null,
                failureReason: null,
              },
            });
            await this.finalizeSucceededRefund(refund.id);
          } else if (refund) {
            await prisma.paymentRefund.update({
              where: { id: refund.id },
              data: {
                status: 'FAILED',
                providerRefundId: refundId,
                providerLeaseToken: null,
                providerLeaseExpiresAt: null,
                failureReason: 'Razorpay refund failed',
              },
            });
          } else if (!refund) {
            await this.releaseWebhook('RAZORPAY', eventId);
            throw ApiError.serviceUnavailable(
              'Refund is not locally visible yet; retry the webhook'
            );
          }
        } else {
          await this.releaseWebhook('RAZORPAY', eventId);
          throw ApiError.serviceUnavailable(
            'Refund is missing its provider ID; retry the webhook'
          );
        }
      } else if (event.event === 'settlement.processed' && settlementEntity) {
        const settlementId = settlementEntity.id;
        const settlementAmount = settlementEntity.amount;
        if (
          typeof settlementId === 'string' &&
          typeof settlementAmount === 'number' &&
          event.account_id
        ) {
          const profile = await prisma.vendorProfile.findUnique({
            where: { providerAccountId: event.account_id },
          });
          if (profile?.paymentProvider === 'RAZORPAY') {
            await prisma.vendorPayout.upsert({
              where: { providerPayoutId: settlementId },
              create: {
                vendorProfileId: profile.id,
                provider: 'RAZORPAY',
                providerPayoutId: settlementId,
                amount: (settlementAmount / 100).toFixed(2),
                currency: 'INR',
                status: 'PAID',
                arrivalDate: new Date(),
              },
              update: { status: 'PAID', arrivalDate: new Date() },
            });
          } else {
            logger.warn(
              `Razorpay settlement ${settlementId} has no matching linked account`
            );
          }
        }
      } else {
        logger.info(`Unhandled Razorpay event: ${event.event}`);
      }
    } catch (error) {
      await this.releaseWebhook('RAZORPAY', eventId);
      throw error;
    }
  }

  async refundOrder(
    orderId: string,
    requestedAmount?: number,
    reason?: string
  ) {
    const recovery = await prisma.paymentRefund.findFirst({
      where: {
        payment: { orderId },
        status: 'SUCCEEDED',
        reversalStatus: { not: 'SUCCEEDED' },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (recovery) {
      await this.finalizeSucceededRefund(recovery.id);
      const reconciled = await prisma.paymentRefund.findUniqueOrThrow({
        where: { id: recovery.id },
      });
      if (reconciled.reversalStatus !== 'SUCCEEDED') {
        throw ApiError.conflict(
          `Refund ${recovery.id} succeeded, but its vendor reversal still requires reconciliation`
        );
      }
      return {
        refundId: recovery.id,
        providerRefundId: recovery.providerRefundId,
        status: 'SUCCEEDED' as const,
        reconciled: true,
      };
    }

    let reservation: Awaited<ReturnType<PaymentService['reserveRefund']>>;
    try {
      reservation = await this.reserveRefund(orderId, requestedAmount, reason);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034') {
        throw ApiError.conflict(
          'Another refund is in progress; reload before retrying'
        );
      }
      throw error;
    }

    try {
      const gateway = paymentGatewayFor(reservation.provider);
      const result = await gateway.refund({
        paymentId: reservation.providerPaymentId,
        amountMinor: reservation.refundMinor,
        isFullRefund: reservation.isProviderFullRefund,
        receipt: reservation.refundRecordId,
        idempotencyKey: reservation.refundRecordId,
      });
      const updated = await prisma.paymentRefund.updateMany({
        where: {
          id: reservation.refundRecordId,
          providerLeaseToken: reservation.providerLeaseToken,
        },
        data: {
          providerRefundId: result.refundId,
          status: result.status,
          providerLeaseToken: null,
          providerLeaseExpiresAt: null,
          failureReason:
            result.status === 'FAILED' ? 'Provider refund failed' : null,
        },
      });
      const authoritative =
        updated.count === 1
          ? {
              status: result.status,
              providerRefundId: result.refundId,
            }
          : await prisma.paymentRefund.findUniqueOrThrow({
              where: { id: reservation.refundRecordId },
              select: { status: true, providerRefundId: true },
            });
      if (authoritative.status === 'SUCCEEDED') {
        await this.finalizeSucceededRefund(reservation.refundRecordId);
      }
      return {
        refundId: reservation.refundRecordId,
        providerRefundId: authoritative.providerRefundId,
        status: authoritative.status,
      };
    } catch (error) {
      await prisma.paymentRefund.updateMany({
        where: {
          id: reservation.refundRecordId,
          providerLeaseToken: reservation.providerLeaseToken,
        },
        data: {
          providerLeaseToken: null,
          providerLeaseExpiresAt: null,
          failureReason:
            'Provider refund result is unknown; reconcile before retrying',
        },
      });
      throw error;
    }
  }

  async refundPayment(
    paymentId: string,
    requestedAmount?: number,
    reason?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw ApiError.notFound('Payment not found');
    return this.refundOrder(payment.orderId, requestedAmount, reason);
  }

  async cancelProcessingPayment(orderId: string) {
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment || payment.status !== 'PROCESSING') return;
    const reference = providerReferenceFor(payment);
    if (reference) await paymentGatewayFor(payment.provider).cancel(reference);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CANCELLED',
        checkoutLeaseExpiresAt: null,
        checkoutLeaseToken: null,
      },
    });
  }

  private async defaultCommissionRate(): Promise<number> {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'defaultCommissionRate' },
    });
    const rate = Number(setting?.value ?? env.PLATFORM_COMMISSION_RATE);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new Error('Platform commission rate must be between 0 and 100');
    }
    return rate;
  }

  private async reserveCheckout(
    orderId: string,
    input: {
      provider: PaymentProvider;
      amount: { toString(): string };
    }
  ) {
    return prisma.$transaction(
      async (tx) => {
        const current = await tx.payment.findUnique({ where: { orderId } });
        if (current && current.status !== 'PROCESSING') {
          throw ApiError.conflict(
            `Payment for this order is already ${current.status.toLowerCase()}`
          );
        }
        const now = new Date();
        if (
          current?.checkoutLeaseExpiresAt &&
          current.checkoutLeaseExpiresAt > now
        ) {
          throw ApiError.conflict('Checkout creation is already in progress');
        }
        const leaseToken = randomUUID();
        const leaseExpiresAt = new Date(now.getTime() + CHECKOUT_LEASE_MS);
        const payment = current
          ? await tx.payment.update({
              where: { id: current.id },
              data: {
                checkoutLeaseToken: leaseToken,
                checkoutLeaseExpiresAt: leaseExpiresAt,
              },
            })
          : await tx.payment.create({
              data: {
                orderId,
                provider: input.provider,
                amount: input.amount.toString(),
                currency: Currency.INR,
                method: 'CARD' as PaymentMethod,
                status: 'PROCESSING',
                checkoutLeaseToken: leaseToken,
                checkoutLeaseExpiresAt: leaseExpiresAt,
              },
            });
        return {
          paymentId: payment.id,
          leaseToken,
          providerReference: providerReferenceFor(payment),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  private async releaseCheckoutLease(paymentId: string, leaseToken: string) {
    await prisma.payment.updateMany({
      where: { id: paymentId, checkoutLeaseToken: leaseToken },
      data: { checkoutLeaseExpiresAt: null, checkoutLeaseToken: null },
    });
  }

  private async reserveRefund(
    orderId: string,
    requestedAmount?: number,
    reason?: string
  ) {
    return prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (
          !payment ||
          payment.status !== 'SUCCEEDED' ||
          !payment.providerPaymentId
        ) {
          throw ApiError.conflict('Order does not have a refundable payment');
        }
        const paidMinor = amountMinor(payment.amount);
        const now = new Date();
        const providerLeaseToken = randomUUID();
        const providerLeaseExpiresAt = new Date(
          now.getTime() + REFUND_PROVIDER_LEASE_MS
        );
        const ambiguous = await tx.paymentRefund.findFirst({
          where: {
            paymentId: payment.id,
            status: 'PENDING',
            providerRefundId: null,
            failureReason: { not: null },
          },
          orderBy: { createdAt: 'asc' },
        });
        if (ambiguous) {
          if (
            ambiguous.providerLeaseExpiresAt &&
            ambiguous.providerLeaseExpiresAt > now
          ) {
            throw ApiError.conflict('This refund is already being reconciled');
          }
          const succeeded = await tx.paymentRefund.aggregate({
            where: { paymentId: payment.id, status: 'SUCCEEDED' },
            _sum: { amount: true },
          });
          const ambiguousMinor = amountMinor(ambiguous.amount);
          const requestedMinor =
            requestedAmount === undefined
              ? paidMinor - amountMinor(succeeded._sum.amount ?? 0)
              : Math.round(requestedAmount * 100);
          if (requestedMinor !== ambiguousMinor) {
            throw ApiError.conflict(
              `Refund ${ambiguous.id} has an unknown provider result; retry the same amount to reconcile it`
            );
          }
          await tx.paymentRefund.update({
            where: { id: ambiguous.id },
            data: { providerLeaseToken, providerLeaseExpiresAt },
          });
          return {
            provider: payment.provider,
            providerPaymentId: payment.providerPaymentId,
            refundRecordId: ambiguous.id,
            refundMinor: ambiguousMinor,
            isProviderFullRefund: ambiguousMinor === paidMinor,
            providerLeaseToken,
          };
        }
        const priorRefunds = await tx.paymentRefund.aggregate({
          where: {
            paymentId: payment.id,
            status: { in: ['PENDING', 'SUCCEEDED'] },
          },
          _sum: { amount: true },
        });
        const alreadyRefundedMinor = amountMinor(priorRefunds._sum.amount ?? 0);
        const refundableMinor = paidMinor - alreadyRefundedMinor;
        const refundMinor =
          requestedAmount === undefined
            ? refundableMinor
            : Math.round(requestedAmount * 100);
        if (refundMinor <= 0 || refundMinor > refundableMinor) {
          throw ApiError.badRequest(
            'Refund amount exceeds the refundable payment'
          );
        }
        const refund = await tx.paymentRefund.create({
          data: {
            paymentId: payment.id,
            provider: payment.provider,
            amount: (refundMinor / 100).toFixed(2),
            reason,
            providerLeaseToken,
            providerLeaseExpiresAt,
          },
        });
        return {
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
          refundRecordId: refund.id,
          refundMinor,
          isProviderFullRefund:
            refundMinor === refundableMinor && alreadyRefundedMinor === 0,
          providerLeaseToken,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  private async finalizeSucceededRefund(refundId: string) {
    const now = new Date();
    const refundToClaim = await prisma.paymentRefund.findUnique({
      where: { id: refundId },
      select: { paymentId: true, status: true },
    });
    if (!refundToClaim || refundToClaim.status !== 'SUCCEEDED') return;

    const paymentLeaseToken = randomUUID();
    const paymentClaimed = await prisma.payment.updateMany({
      where: {
        id: refundToClaim.paymentId,
        OR: [
          { reversalLeaseExpiresAt: null },
          { reversalLeaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        reversalLeaseToken: paymentLeaseToken,
        reversalLeaseExpiresAt: new Date(now.getTime() + REVERSAL_LEASE_MS),
      },
    });
    if (paymentClaimed.count === 0) return;

    const claimed = await prisma.paymentRefund.updateMany({
      where: {
        id: refundId,
        status: 'SUCCEEDED',
        OR: [
          { reversalStatus: 'PENDING' },
          { reversalStatus: 'FAILED' },
          {
            reversalStatus: 'PROCESSING',
            OR: [
              { reversalLeaseExpiresAt: null },
              { reversalLeaseExpiresAt: { lte: now } },
            ],
          },
        ],
      },
      data: {
        reversalStatus: 'PROCESSING',
        reversalFailureReason: null,
        reversalLeaseExpiresAt: new Date(now.getTime() + REVERSAL_LEASE_MS),
        reversalAttempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) {
      await this.releasePaymentReversalLease(
        refundToClaim.paymentId,
        paymentLeaseToken
      );
      return;
    }

    const refund = await prisma.paymentRefund.findUniqueOrThrow({
      where: { id: refundId },
      include: { payment: true },
    });
    const refundMinor = amountMinor(refund.amount);
    const paidMinor = amountMinor(refund.payment.amount);
    const confirmed = await prisma.paymentRefund.aggregate({
      where: { paymentId: refund.paymentId, status: 'SUCCEEDED' },
      _sum: { amount: true },
    });
    const confirmedMinor = amountMinor(confirmed._sum.amount ?? 0);
    let reversalSucceeded = true;
    try {
      const isWholePaymentRefund = refundMinor === paidMinor;
      if (refund.provider === 'RAZORPAY' && isWholePaymentRefund) {
        const earnings = await prisma.vendorEarning.findMany({
          where: { orderId: refund.payment.orderId },
        });
        await prisma.$transaction(
          earnings.map((earning) =>
            prisma.vendorEarning.update({
              where: { id: earning.id },
              data: {
                reversedAmount: earning.netAmount,
                status: 'REVERSED',
              },
            })
          )
        );
      } else {
        reversalSucceeded = await vendorPayoutService.reverseEarningsForOrder(
          refund.payment.orderId,
          { refundedMinor: confirmedMinor, paidMinor },
          refund.id
        );
      }
    } catch (error) {
      reversalSucceeded = false;
      logger.error(`Refund ${refund.id} reversal failed:`, error);
    }

    await prisma.paymentRefund.update({
      where: { id: refund.id },
      data: reversalSucceeded
        ? {
            reversalStatus: 'SUCCEEDED',
            reversalFailureReason: null,
            reversalLeaseExpiresAt: null,
          }
        : {
            reversalStatus: 'FAILED',
            reversalFailureReason: 'Vendor transfer reversal failed',
            reversalLeaseExpiresAt: null,
          },
    });

    if (confirmedMinor >= paidMinor) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: refund.paymentId },
          data: { status: 'REFUNDED' },
        }),
        ...(reversalSucceeded
          ? [
              prisma.vendorEarning.updateMany({
                where: { orderId: refund.payment.orderId },
                data: { status: 'REVERSED' },
              }),
            ]
          : []),
      ]);
    }

    await this.releasePaymentReversalLease(refund.paymentId, paymentLeaseToken);
    const nextRefund = await prisma.paymentRefund.findFirst({
      where: {
        paymentId: refund.paymentId,
        id: { not: refund.id },
        status: 'SUCCEEDED',
        OR: [
          { reversalStatus: 'PENDING' },
          {
            reversalStatus: 'PROCESSING',
            reversalLeaseExpiresAt: { lte: new Date() },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (nextRefund) await this.finalizeSucceededRefund(nextRefund.id);
  }

  private async releasePaymentReversalLease(
    paymentId: string,
    leaseToken: string
  ) {
    await prisma.payment.updateMany({
      where: { id: paymentId, reversalLeaseToken: leaseToken },
      data: { reversalLeaseExpiresAt: null, reversalLeaseToken: null },
    });
  }

  private async markPaymentSucceeded(
    paymentId: string,
    providerPaymentId: string,
    providerPaymentMethodId?: string | null
  ) {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
          providerPaymentId,
          providerPaymentMethodId,
        },
        select: { orderId: true },
      });
      await tx.vendorOrder.updateMany({
        where: { orderId: payment.orderId },
        data: { status: 'CONFIRMED' },
      });
    });
  }

  private async claimWebhook(
    provider: PaymentProvider,
    eventId: string,
    eventType: string
  ): Promise<boolean> {
    try {
      await prisma.paymentWebhookEvent.create({
        data: { provider, eventId, eventType },
      });
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return false;
      throw error;
    }
  }

  private async releaseWebhook(provider: PaymentProvider, eventId: string) {
    await prisma.paymentWebhookEvent.deleteMany({
      where: { provider, eventId },
    });
  }
}

export const paymentService = new PaymentService();
