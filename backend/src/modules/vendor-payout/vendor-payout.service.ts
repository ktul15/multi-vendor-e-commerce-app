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
import { paymentGatewayFor } from '../payment/providers/payment-gateway.registry';

const notificationService = new NotificationService();

type ConnectAccountState = Pick<
  Stripe.Account,
  'charges_enabled' | 'details_submitted' | 'payouts_enabled'
> &
  Readonly<{
    requirements?: Partial<
      Pick<
        Stripe.Account.Requirements,
        | 'currently_due'
        | 'disabled_reason'
        | 'past_due'
        | 'pending_verification'
      >
    >;
  }>;

export function connectOnboardingStatus(
  account: ConnectAccountState
): VendorOnboardingStatus {
  if (
    account.details_submitted &&
    account.charges_enabled &&
    account.payouts_enabled
  ) {
    return 'COMPLETE';
  }
  const disabledReason = account.requirements?.disabled_reason;
  const hasActionableRequirements = Boolean(
    account.requirements?.currently_due?.length ||
    account.requirements?.past_due?.length
  );
  if (
    hasActionableRequirements ||
    (disabledReason && disabledReason !== 'requirements.pending_verification')
  ) {
    return 'RESTRICTED';
  }
  return 'PENDING';
}

export class VendorPayoutService {
  // ─── Connect Onboarding ────────────────────────────────────────────

  async createConnectAccount(userId: string) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw ApiError.notFound('Vendor profile not found');

    if (profile.paymentProvider === 'RAZORPAY') {
      if (!env.RAZORPAY_SANDBOX_MOCK) {
        throw ApiError.conflict(
          'Live Razorpay Linked Account KYC is outside this sandbox-only integration'
        );
      }
      const accountId =
        profile.providerAccountId ??
        `acc_mock_${profile.id.replaceAll('-', '').slice(0, 18)}`;
      await prisma.vendorProfile.update({
        where: { id: profile.id },
        data: {
          providerAccountId: accountId,
          paymentOnboardingStatus: 'COMPLETE',
        },
      });
      return {
        provider: 'RAZORPAY' as const,
        accountId,
        onboardingStatus: 'COMPLETE' as const,
        sandbox: true,
      };
    }

    // If already has a Stripe account, just generate a new onboarding link
    if (profile.providerAccountId) {
      const accountLink = await stripe.accountLinks.create({
        account: profile.providerAccountId,
        refresh_url: env.STRIPE_CONNECT_REFRESH_URL,
        return_url: env.STRIPE_CONNECT_RETURN_URL,
        type: 'account_onboarding',
      });
      return { url: accountLink.url };
    }

    const account = await stripe.accounts.create(
      {
        type: 'express',
        email: (
          await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          })
        )?.email,
        metadata: { userId, vendorProfileId: profile.id },
      },
      { idempotencyKey: `vendor-connect-account:${profile.id}` }
    );

    await prisma.vendorProfile.update({
      where: { userId },
      data: {
        providerAccountId: account.id,
        paymentOnboardingStatus: 'PENDING',
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
    if (profile.paymentProvider === 'RAZORPAY') {
      return this.createConnectAccount(userId);
    }
    if (!profile.providerAccountId) {
      throw ApiError.badRequest(
        'No Stripe account found — start onboarding first'
      );
    }

    const accountLink = await stripe.accountLinks.create({
      account: profile.providerAccountId,
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

    if (!profile.providerAccountId) {
      return {
        provider: profile.paymentProvider,
        onboardingStatus: profile.paymentOnboardingStatus,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    if (profile.paymentProvider === 'RAZORPAY') {
      return {
        provider: 'RAZORPAY' as const,
        onboardingStatus: profile.paymentOnboardingStatus,
        chargesEnabled: profile.paymentOnboardingStatus === 'COMPLETE',
        payoutsEnabled: profile.paymentOnboardingStatus === 'COMPLETE',
        detailsSubmitted: profile.paymentOnboardingStatus === 'COMPLETE',
        sandbox: env.RAZORPAY_SANDBOX_MOCK,
      };
    }
    const account = await stripe.accounts.retrieve(profile.providerAccountId);
    const onboardingStatus = await this.syncAccountStatus(profile, account);

    return {
      provider: 'STRIPE' as const,
      onboardingStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  // ─── Transfers (called from payment webhook) ──────────────────────

  async createTransfersForPayment(paymentIntentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { providerPaymentId: paymentIntentId },
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
    if (payment.provider !== 'STRIPE') return;

    for (const vendorOrder of payment.order.vendorOrders) {
      const earning = await prisma.vendorEarning.findUnique({
        where: { vendorOrderId: vendorOrder.id },
      });
      const profile = vendorOrder.vendor.vendorProfile;
      if (!earning || !profile) {
        logger.warn(
          `createTransfersForPayment: vendor ${vendorOrder.vendorId} has no payment allocation, skipping`
        );
        continue;
      }
      let transferredNow = false;
      if (
        ['PENDING', 'FAILED'].includes(earning.status) &&
        !earning.providerTransferId &&
        profile.paymentProvider === 'STRIPE' &&
        profile.paymentOnboardingStatus === 'COMPLETE' &&
        profile.providerAccountId
      ) {
        try {
          const transferableMinor =
            Math.round(Number(earning.netAmount) * 100) -
            Math.round(Number(earning.reversedAmount) * 100);
          if (transferableMinor <= 0) {
            await prisma.vendorEarning.update({
              where: { id: earning.id },
              data: { status: 'REVERSED' },
            });
            continue;
          }
          const transferId = await paymentGatewayFor('STRIPE').createTransfer({
            paymentId: paymentIntentId,
            orderId: payment.order.id,
            transfer: {
              accountId: profile.providerAccountId,
              amountMinor: transferableMinor,
              earningId: earning.id,
              vendorOrderId: vendorOrder.id,
            },
          });
          const transitioned = await prisma.vendorEarning.updateMany({
            where: {
              id: earning.id,
              status: { in: ['PENDING', 'FAILED'] },
              providerTransferId: null,
            },
            data: {
              providerTransferId: transferId,
              status: 'TRANSFERRED',
              transferredAt: new Date(),
            },
          });
          transferredNow = transitioned.count === 1;
        } catch (err) {
          logger.error(
            `Failed to create Stripe transfer for earning ${earning.id}:`,
            err
          );
          await prisma.vendorEarning.updateMany({
            where: { id: earning.id, providerTransferId: null },
            data: { status: 'FAILED' },
          });
        }
      }

      if (transferredNow) {
        await notificationService
          .createAndSend(
            vendorOrder.vendorId,
            'VENDOR_EARNING_CREATED',
            'New Earning',
            `You earned ₹${Number(earning.netAmount).toFixed(2)} from order #${payment.order.orderNumber}`,
            { orderId: payment.order.id, vendorOrderId: vendorOrder.id }
          )
          .catch((err) =>
            logger.error('Failed to send earning notification:', err)
          );
      }
    }
  }

  // ─── Reversal (called from order cancellation) ────────────────────

  async reverseEarningsForOrder(
    orderId: string,
    cumulative: { refundedMinor: number; paidMinor: number },
    idempotencyKey?: string
  ): Promise<boolean> {
    const earnings = await prisma.vendorEarning.findMany({
      where: { orderId },
      include: { order: { select: { paymentProvider: true } } },
    });

    let succeeded = true;
    for (const earning of earnings) {
      if (earning.status === 'REVERSED') continue;
      if (earning.status === 'FAILED') {
        succeeded = false;
        continue;
      }

      const fullNetMinor = Math.round(Number(earning.netAmount) * 100);
      const alreadyReversedMinor = Math.round(
        Number(earning.reversedAmount) * 100
      );
      const targetReversedMinor = Math.min(
        fullNetMinor,
        Math.round(
          (fullNetMinor * cumulative.refundedMinor) / cumulative.paidMinor
        )
      );
      const reversalMinor = targetReversedMinor - alreadyReversedMinor;
      if (reversalMinor <= 0) continue;

      if (earning.providerTransferId) {
        try {
          await paymentGatewayFor(
            earning.order.paymentProvider
          ).reverseTransfer(
            earning.providerTransferId,
            reversalMinor,
            idempotencyKey
              ? `${idempotencyKey}:${earning.id}:${targetReversedMinor}`
              : undefined
          );
        } catch (err) {
          logger.error(
            `Failed to reverse provider transfer ${earning.providerTransferId}:`,
            err
          );
          succeeded = false;
          continue;
        }
      }

      await prisma.vendorEarning.update({
        where: { id: earning.id },
        data: {
          reversedAmount: (targetReversedMinor / 100).toFixed(2),
          status:
            targetReversedMinor >= fullNetMinor ? 'REVERSED' : earning.status,
        },
      });
    }
    return succeeded;
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
              where: { providerTransferId: transfer.id },
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
            .findUnique({ where: { providerTransferId: transfer.id } })
            .then(async (earning) => {
              if (!earning) return;
              const fullNetMinor = Math.round(Number(earning.netAmount) * 100);
              const reconciledMinor = Math.max(
                Math.round(Number(earning.reversedAmount) * 100),
                Math.min(fullNetMinor, transfer.amount_reversed)
              );
              await prisma.vendorEarning.update({
                where: { id: earning.id },
                data: {
                  reversedAmount: (reconciledMinor / 100).toFixed(2),
                  status:
                    reconciledMinor >= fullNetMinor
                      ? 'REVERSED'
                      : earning.status,
                },
              });
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
      where: { providerAccountId: account.id },
    });

    if (!profile) return;

    await this.syncAccountStatus(profile, account);
  }

  private async syncAccountStatus(
    profile: Readonly<{
      id: string;
      userId: string;
      paymentOnboardingStatus: VendorOnboardingStatus;
    }>,
    account: ConnectAccountState
  ): Promise<VendorOnboardingStatus> {
    const newStatus = connectOnboardingStatus(account);

    if (profile.paymentOnboardingStatus !== newStatus) {
      const updated = await prisma.vendorProfile.updateMany({
        where: {
          id: profile.id,
          paymentProvider: 'STRIPE',
          paymentOnboardingStatus: profile.paymentOnboardingStatus,
        },
        data: { paymentOnboardingStatus: newStatus },
      });

      if (updated.count > 0 && newStatus === 'COMPLETE') {
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
    return newStatus;
  }

  private async upsertPayout(payout: Stripe.Payout, status: 'PAID' | 'FAILED') {
    // Payout events from Connect come with the connected account ID
    const connectedAccountId = (payout as Stripe.Payout & { account?: string })
      .account;

    if (!connectedAccountId) return;

    const profile = await prisma.vendorProfile.findUnique({
      where: { providerAccountId: connectedAccountId as string },
    });

    if (!profile) return;

    const currencyUpper = payout.currency.toUpperCase();
    const validCurrency = Object.values(Currency).includes(
      currencyUpper as Currency
    )
      ? (currencyUpper as Currency)
      : 'INR';

    await prisma.vendorPayout.upsert({
      where: { providerPayoutId: payout.id },
      create: {
        vendorProfileId: profile.id,
        provider: 'STRIPE',
        providerPayoutId: payout.id,
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
          { providerPayoutId: payout.id, provider: 'STRIPE' }
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
          { providerPayoutId: payout.id, provider: 'STRIPE' }
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

  async updatePaymentProvider(
    vendorId: string,
    input: { paymentProvider: 'STRIPE' | 'RAZORPAY'; settlementCountry: string }
  ) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: vendorId },
    });
    if (!profile) throw ApiError.notFound('Vendor profile not found');

    const activePayments = await prisma.payment.count({
      where: {
        status: { in: ['PROCESSING', 'SUCCEEDED'] },
        order: { vendorOrders: { some: { vendorId } } },
      },
    });
    if (
      activePayments > 0 &&
      profile.paymentProvider !== input.paymentProvider
    ) {
      throw ApiError.conflict(
        'Cannot change provider while the vendor has processing or paid orders'
      );
    }

    return prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        paymentProvider: input.paymentProvider,
        settlementCountry: input.settlementCountry,
        ...(profile.paymentProvider !== input.paymentProvider && {
          providerAccountId: null,
          paymentOnboardingStatus: 'NOT_STARTED',
        }),
      },
      select: {
        id: true,
        userId: true,
        paymentProvider: true,
        settlementCountry: true,
        paymentOnboardingStatus: true,
      },
    });
  }
}

export const vendorPayoutService = new VendorPayoutService();
