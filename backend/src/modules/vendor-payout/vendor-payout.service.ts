import type Stripe from 'stripe';
import { prisma } from '../../config/prisma';
import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';
import { NotificationService } from '../notification/notification.service';
import {
  Currency,
  EarningStatus,
  Prisma,
  VendorOnboardingStatus,
} from '../../generated/prisma/client';
import {
  GetEarningsQueryInput,
  GetPayoutsQueryInput,
} from './vendor-payout.validation';

const notificationService = new NotificationService();

export class VendorPayoutService {
  // ─── Connect Onboarding ────────────────────────────────────────────

  async createConnectAccount(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw ApiError.notFound('Vendor profile not found');

    // If already has a Stripe account, just generate a new onboarding link
    if (profile.stripeAccountId) {
      const accountLink = await stripe.accountLinks.create({
        account: profile.stripeAccountId,
        refresh_url: env.STRIPE_CONNECT_REFRESH_URL,
        return_url: env.STRIPE_CONNECT_RETURN_URL,
        type: 'account_onboarding',
      });
      return { url: accountLink.url };
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })
      )?.email,
      metadata: { userId, vendorProfileId: profile.id },
    });

    await prisma.vendorProfile.update({
      where: { userId },
      data: {
        stripeAccountId: account.id,
        stripeOnboardingStatus: 'PENDING',
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: env.STRIPE_CONNECT_REFRESH_URL,
      return_url: env.STRIPE_CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async refreshOnboardingLink(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw ApiError.notFound('Vendor profile not found');
    if (!profile.stripeAccountId) {
      throw ApiError.badRequest(
        'No Stripe account found — start onboarding first'
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: profile.stripeAccountId,
      refresh_url: env.STRIPE_CONNECT_REFRESH_URL,
      return_url: env.STRIPE_CONNECT_RETURN_URL,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async getConnectStatus(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw ApiError.notFound('Vendor profile not found');

    if (!profile.stripeAccountId) {
      return {
        onboardingStatus: profile.stripeOnboardingStatus,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const account = await stripe.accounts.retrieve(profile.stripeAccountId);

    return {
      onboardingStatus: profile.stripeOnboardingStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  // ─── Transfers (called from payment webhook) ──────────────────────

  async createTransfersForPayment(paymentIntentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        order: {
          include: {
            vendorOrders: {
              include: {
                vendor: {
                  include: { vendorProfile: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      logger.warn(
        `createTransfersForPayment: no payment found for intent ${paymentIntentId}`
      );
      return;
    }

    const commissionSetting = await prisma.platformSetting.findUnique({
      where: { key: 'defaultCommissionRate' },
    });
    const defaultRate = commissionSetting
      ? parseFloat(commissionSetting.value)
      : parseFloat(env.PLATFORM_COMMISSION_RATE);
    if (isNaN(defaultRate)) {
      throw new Error(
        'Platform commission rate is not a valid number — check PlatformSetting or PLATFORM_COMMISSION_RATE env var'
      );
    }

    for (const vendorOrder of payment.order.vendorOrders) {
      // Idempotency: skip if earning already exists for this vendor order
      const existing = await prisma.vendorEarning.findUnique({
        where: { vendorOrderId: vendorOrder.id },
      });
      if (existing) continue;

      const profile = vendorOrder.vendor.vendorProfile;
      if (!profile) {
        logger.warn(
          `createTransfersForPayment: vendor ${vendorOrder.vendorId} has no profile, skipping`
        );
        continue;
      }

      const commissionRate =
        profile.commissionRate !== null
          ? parseFloat(profile.commissionRate.toString())
          : defaultRate;

      const grossAmount =
        Math.round(parseFloat(vendorOrder.subtotal.toString()) * 100) / 100;
      const commissionAmount =
        Math.round(grossAmount * (commissionRate / 100) * 100) / 100;
      const netAmount =
        Math.round((grossAmount - commissionAmount) * 100) / 100;

      const earning = await prisma.vendorEarning.create({
        data: {
          vendorProfileId: profile.id,
          vendorOrderId: vendorOrder.id,
          orderId: payment.order.id,
          grossAmount,
          commissionRate,
          commissionAmount,
          netAmount,
          currency: payment.currency,
          status: 'PENDING',
        },
      });

      // Only transfer if vendor has completed Connect onboarding
      if (
        profile.stripeOnboardingStatus === 'COMPLETE' &&
        profile.stripeAccountId
      ) {
        try {
          const netAmountInCents = Math.round(netAmount * 100);

          const transfer = await stripe.transfers.create({
            amount: netAmountInCents,
            currency: payment.currency.toLowerCase(),
            destination: profile.stripeAccountId,
            transfer_group: payment.order.id,
            metadata: {
              vendorEarningId: earning.id,
              vendorOrderId: vendorOrder.id,
            },
          });

          await prisma.vendorEarning.update({
            where: { id: earning.id },
            data: {
              stripeTransferId: transfer.id,
              status: 'TRANSFERRED',
              transferredAt: new Date(),
            },
          });
        } catch (err) {
          logger.error(
            `Failed to create Stripe transfer for earning ${earning.id}:`,
            err
          );
          await prisma.vendorEarning.update({
            where: { id: earning.id },
            data: { status: 'FAILED' },
          });
        }
      }

      // Notify vendor about the new earning
      await notificationService
        .createAndSend(
          vendorOrder.vendorId,
          'VENDOR_EARNING_CREATED',
          'New Earning',
          `You earned $${netAmount.toFixed(2)} from order #${payment.order.orderNumber}`,
          { orderId: payment.order.id, vendorOrderId: vendorOrder.id }
        )
        .catch((err) =>
          logger.error('Failed to send earning notification:', err)
        );
    }
  }

  // ─── Reversal (called from order cancellation) ────────────────────

  async reverseEarningsForOrder(orderId: string) {
    const earnings = await prisma.vendorEarning.findMany({
      where: { orderId },
    });

    for (const earning of earnings) {
      if (earning.status === 'REVERSED') continue;

      if (
        earning.status === 'TRANSFERRED' &&
        earning.stripeTransferId
      ) {
        try {
          await stripe.transfers.createReversal(earning.stripeTransferId);
        } catch (err) {
          logger.error(
            `Failed to reverse Stripe transfer ${earning.stripeTransferId}:`,
            err
          );
          // Continue — mark as REVERSED in DB regardless so we don't double-reverse
        }
      }

      await prisma.vendorEarning.update({
        where: { id: earning.id },
        data: { status: 'REVERSED' },
      });
    }
  }

  // ─── Connect Webhook ──────────────────────────────────────────────

  async handleConnectWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_CONNECT_WEBHOOK_SECRET
      );
    } catch {
      throw ApiError.badRequest('Invalid Connect webhook signature');
    }

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await this.handleAccountUpdated(account);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        if (transfer.id) {
          await prisma.vendorEarning
            .update({
              where: { stripeTransferId: transfer.id },
              data: { status: 'TRANSFERRED', transferredAt: new Date() },
            })
            .catch((err) => {
              // Transfer may not match any earning (e.g. manual transfer)
              logger.warn(
                `transfer.created webhook: no earning found for transfer ${transfer.id}:`,
                err
              );
            });
        }
        break;
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer;
        if (transfer.id) {
          await prisma.vendorEarning
            .update({
              where: { stripeTransferId: transfer.id },
              data: { status: 'REVERSED' },
            })
            .catch((err) => {
              logger.warn(
                `transfer.reversed webhook: no earning found for transfer ${transfer.id}:`,
                err
              );
            });
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        await this.upsertPayout(payout, 'PAID');
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        await this.upsertPayout(payout, 'FAILED');
        break;
      }

      default:
        logger.info(`Unhandled Connect event: ${event.type}`);
        break;
    }
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    if (!account.id) return;

    const profile = await prisma.vendorProfile.findUnique({
      where: { stripeAccountId: account.id },
    });

    if (!profile) return;

    let newStatus: VendorOnboardingStatus;

    if (account.charges_enabled && account.details_submitted) {
      newStatus = 'COMPLETE';
    } else if (account.details_submitted && !account.charges_enabled) {
      newStatus = 'RESTRICTED';
    } else {
      newStatus = 'PENDING';
    }

    if (profile.stripeOnboardingStatus !== newStatus) {
      await prisma.vendorProfile.update({
        where: { id: profile.id },
        data: { stripeOnboardingStatus: newStatus },
      });

      if (newStatus === 'COMPLETE') {
        await notificationService
          .createAndSend(
            profile.userId,
            'VENDOR_ONBOARDING_COMPLETE',
            'Stripe Onboarding Complete',
            'Your Stripe account is fully set up. You can now receive payouts!',
            { vendorProfileId: profile.id }
          )
          .catch((err) =>
            logger.error('Failed to send onboarding notification:', err)
          );
      }
    }
  }

  private async upsertPayout(
    payout: Stripe.Payout,
    status: 'PAID' | 'FAILED'
  ) {
    // Payout events from Connect come with the connected account ID
    const connectedAccountId = (payout as Stripe.Payout & { account?: string })
      .account;

    if (!connectedAccountId) return;

    const profile = await prisma.vendorProfile.findUnique({
      where: { stripeAccountId: connectedAccountId as string },
    });

    if (!profile) return;

    const currencyUpper = payout.currency.toUpperCase();
    const validCurrency = Object.values(Currency).includes(
      currencyUpper as Currency
    )
      ? (currencyUpper as Currency)
      : 'USD';

    await prisma.vendorPayout.upsert({
      where: { stripePayoutId: payout.id },
      create: {
        vendorProfileId: profile.id,
        stripePayoutId: payout.id,
        amount: (payout.amount / 100).toFixed(2),
        currency: validCurrency,
        status,
        arrivalDate: payout.arrival_date
          ? new Date(payout.arrival_date * 1000)
          : null,
        failureReason:
          status === 'FAILED' ? (payout.failure_message ?? null) : null,
      },
      update: {
        status,
        arrivalDate: payout.arrival_date
          ? new Date(payout.arrival_date * 1000)
          : null,
        failureReason:
          status === 'FAILED' ? (payout.failure_message ?? null) : null,
      },
    });

    if (status === 'FAILED') {
      await notificationService
        .createAndSend(
          profile.userId,
          'VENDOR_PAYOUT_FAILED',
          'Payout Failed',
          `A payout of $${(payout.amount / 100).toFixed(2)} to your bank account failed.`,
          { stripePayoutId: payout.id }
        )
        .catch((err) =>
          logger.error('Failed to send payout failure notification:', err)
        );
    }

    if (status === 'PAID') {
      await notificationService
        .createAndSend(
          profile.userId,
          'VENDOR_PAYOUT_PAID',
          'Payout Received',
          `A payout of $${(payout.amount / 100).toFixed(2)} is on its way to your bank account.`,
          { stripePayoutId: payout.id }
        )
        .catch((err) =>
          logger.error('Failed to send payout paid notification:', err)
        );
    }
  }

  // ─── Earnings & Payouts Queries ───────────────────────────────────

  async getEarnings(vendorProfileId: string, query: GetEarningsQueryInput) {
    const { page, limit, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorEarningWhereInput = { vendorProfileId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lt: new Date(endDate) }),
      };
    }

    const [earnings, total] = await Promise.all([
      prisma.vendorEarning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: { select: { orderNumber: true } },
        },
      }),
      prisma.vendorEarning.count({ where }),
    ]);

    return {
      earnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEarningsSummary(vendorProfileId: string) {
    const statuses: EarningStatus[] = [
      'PENDING',
      'TRANSFERRED',
      'FAILED',
      'REVERSED',
    ];

    const aggregations = await Promise.all(
      statuses.map((status) =>
        prisma.vendorEarning.aggregate({
          where: { vendorProfileId, status },
          _sum: {
            grossAmount: true,
            commissionAmount: true,
            netAmount: true,
          },
          _count: true,
        })
      )
    );

    const summary: Record<
      string,
      {
        count: number;
        grossAmount: number;
        commissionAmount: number;
        netAmount: number;
      }
    > = {};

    statuses.forEach((status, i) => {
      const agg = aggregations[i];
      summary[status.toLowerCase()] = {
        count: agg._count,
        grossAmount: parseFloat(agg._sum.grossAmount?.toString() ?? '0'),
        commissionAmount: parseFloat(
          agg._sum.commissionAmount?.toString() ?? '0'
        ),
        netAmount: parseFloat(agg._sum.netAmount?.toString() ?? '0'),
      };
    });

    return summary;
  }

  async getPayouts(vendorProfileId: string, query: GetPayoutsQueryInput) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorPayoutWhereInput = { vendorProfileId };
    if (status) where.status = status;

    const [payouts, total] = await Promise.all([
      prisma.vendorPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vendorPayout.count({ where }),
    ]);

    return {
      payouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Admin: Commission Rate ───────────────────────────────────────

  async updateCommissionRate(vendorId: string, commissionRate: number) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: vendorId },
    });

    if (!profile) throw ApiError.notFound('Vendor profile not found');

    await prisma.vendorProfile.update({
      where: { id: profile.id },
      data: { commissionRate },
    });

    return {
      vendorId,
      commissionRate,
    };
  }
}

export const vendorPayoutService = new VendorPayoutService();
