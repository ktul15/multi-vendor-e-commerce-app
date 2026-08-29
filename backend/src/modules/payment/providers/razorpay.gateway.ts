import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../../config/env';
import { razorpay } from '../../../config/razorpay';
import {
  CheckoutRequest,
  CheckoutSession,
  PaymentGateway,
  ProviderTransferResult,
  RefundResult,
} from './payment-gateway';

const mockId = (prefix: string, value: string): string =>
  `${prefix}_mock_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;

const signatureFor = (orderId: string, paymentId: string): string =>
  createHmac('sha256', env.RAZORPAY_KEY_SECRET || 'sandbox-mock-secret')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

export const verifyRazorpayPaymentSignature = (input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean => {
  const expected = Buffer.from(signatureFor(input.orderId, input.paymentId));
  const received = Buffer.from(input.signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

export const verifyRazorpayWebhookSignature = (
  rawBody: Buffer,
  signature: string
): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET && !env.RAZORPAY_SANDBOX_MOCK) return false;
  const expected = Buffer.from(
    createHmac(
      'sha256',
      env.RAZORPAY_SANDBOX_MOCK
        ? env.RAZORPAY_WEBHOOK_SECRET || 'sandbox-mock-webhook-secret'
        : env.RAZORPAY_WEBHOOK_SECRET
    )
      .update(rawBody)
      .digest('hex')
  );
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

const transferResults = (
  request: CheckoutRequest,
  transfers: unknown
): ProviderTransferResult[] => {
  const items = Array.isArray(transfers)
    ? transfers
    : typeof transfers === 'object' &&
        transfers !== null &&
        'items' in transfers &&
        Array.isArray((transfers as { items: unknown }).items)
      ? (transfers as { items: unknown[] }).items
      : [];
  return request.transfers.map((requested, index) => {
    const item = items[index] as { id?: unknown } | undefined;
    if (typeof item?.id !== 'string') {
      throw new Error(
        'Razorpay did not return the expected Route transfer IDs'
      );
    }
    return { earningId: requested.earningId, transferId: item.id };
  });
};

export class RazorpayGateway implements PaymentGateway {
  readonly provider = 'RAZORPAY' as const;

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    if (env.RAZORPAY_SANDBOX_MOCK) return this.mockCheckout(request);

    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay Test Mode credentials are not configured');
    }

    const prior = await razorpay.orders.all({
      receipt: request.orderNumber,
      count: 1,
      'expand[]': 'transfers',
    });
    const existing = prior.items[0];
    if (existing) {
      if (
        Number(existing.amount) !== request.amountMinor ||
        existing.currency !== 'INR'
      ) {
        throw new Error('Razorpay receipt is already used for another amount');
      }
      if (!['created', 'attempted'].includes(existing.status)) {
        throw new Error(`Razorpay order is already ${existing.status}`);
      }
      return {
        provider: 'RAZORPAY',
        providerOrderId: existing.id,
        keyId: env.RAZORPAY_KEY_ID,
        amount: Number(existing.amount),
        currency: 'INR',
        name: 'Multi-Vendor Storefront',
        description: request.description,
        prefill: {
          name: request.shipping.name,
          contact: request.shipping.phone,
        },
        transfers: transferResults(request, existing.transfers),
      };
    }

    const order = await razorpay.orders.create({
      amount: request.amountMinor,
      currency: 'INR',
      receipt: request.orderNumber,
      notes: { orderId: request.orderId, sandbox: 'true' },
      transfers: request.transfers.map((transfer) => ({
        account: transfer.accountId,
        amount: transfer.amountMinor,
        currency: 'INR',
        notes: {
          earningId: transfer.earningId,
          vendorOrderId: transfer.vendorOrderId,
        },
        linked_account_notes: ['earningId', 'vendorOrderId'],
        on_hold: false,
      })),
    });

    return {
      provider: 'RAZORPAY',
      providerOrderId: order.id,
      keyId: env.RAZORPAY_KEY_ID,
      amount: request.amountMinor,
      currency: 'INR',
      name: 'Multi-Vendor Storefront',
      description: request.description,
      prefill: { name: request.shipping.name, contact: request.shipping.phone },
      transfers: transferResults(request, order.transfers),
    };
  }

  async reuseCheckout(
    providerReference: string,
    request: CheckoutRequest
  ): Promise<CheckoutSession | null> {
    if (env.RAZORPAY_SANDBOX_MOCK) return this.mockCheckout(request);
    const order = await razorpay.orders.fetchTransferOrder(providerReference);
    if (!['created', 'attempted'].includes(order.status)) return null;
    return {
      provider: 'RAZORPAY',
      providerOrderId: order.id,
      keyId: env.RAZORPAY_KEY_ID,
      amount: Number(order.amount),
      currency: 'INR',
      name: 'Multi-Vendor Storefront',
      description: request.description,
      prefill: { name: request.shipping.name, contact: request.shipping.phone },
      transfers: transferResults(request, order.transfers),
    };
  }

  async cancel(_providerReference: string): Promise<void> {
    // Razorpay Orders cannot be cancelled. An unpaid order expires without
    // settlement, so cancellation is represented in the local order state.
  }

  async createTransfer(input: {
    paymentId: string;
    orderId: string;
    transfer: {
      accountId: string;
      amountMinor: number;
      earningId: string;
      vendorOrderId: string;
    };
  }): Promise<string> {
    if (env.RAZORPAY_SANDBOX_MOCK) {
      return mockId('trf', `${input.orderId}:${input.transfer.earningId}`);
    }
    const response = await razorpay.payments.transfer(input.paymentId, {
      transfers: [
        {
          account: input.transfer.accountId,
          amount: input.transfer.amountMinor,
          currency: 'INR',
          notes: {
            earningId: input.transfer.earningId,
            vendorOrderId: input.transfer.vendorOrderId,
          },
          on_hold: false,
        },
      ],
    });
    const transfer = response.items[0];
    if (!transfer?.id) throw new Error('Razorpay transfer ID is missing');
    return transfer.id;
  }

  async refund(input: {
    paymentId: string;
    amountMinor: number;
    isFullRefund: boolean;
    receipt: string;
    idempotencyKey: string;
  }): Promise<RefundResult> {
    if (env.RAZORPAY_SANDBOX_MOCK) {
      return {
        refundId: mockId('rfnd', `${input.paymentId}:${input.receipt}`),
        status: 'SUCCEEDED',
      };
    }
    let existing:
      | {
          id: string;
          amount?: number | string;
          receipt?: string | null;
          notes?: Record<string, unknown> | null;
          status?: string;
        }
      | undefined;
    for (let skip = 0; !existing; skip += 100) {
      const prior = await razorpay.payments.fetchMultipleRefund(
        input.paymentId,
        { count: 100, skip }
      );
      existing = prior.items.find(
        (refund) =>
          refund.receipt === input.receipt ||
          refund.notes?.refundRecordId === input.idempotencyKey
      );
      if (prior.items.length < 100) break;
    }
    if (existing) {
      if (Number(existing.amount) !== input.amountMinor) {
        throw new Error(
          'Razorpay refund receipt is already used for another amount'
        );
      }
      return {
        refundId: existing.id,
        status:
          existing.status === 'processed'
            ? 'SUCCEEDED'
            : existing.status === 'failed'
              ? 'FAILED'
              : 'PENDING',
      };
    }
    const refund = await razorpay.payments.refund(input.paymentId, {
      amount: input.amountMinor,
      reverse_all: input.isFullRefund,
      receipt: input.receipt,
      notes: { refundRecordId: input.idempotencyKey },
    });
    return {
      refundId: refund.id,
      status:
        refund.status === 'processed'
          ? 'SUCCEEDED'
          : refund.status === 'failed'
            ? 'FAILED'
            : 'PENDING',
    };
  }

  async reverseTransfer(
    transferId: string,
    amountMinor?: number,
    idempotencyKey?: string
  ): Promise<void> {
    if (env.RAZORPAY_SANDBOX_MOCK) return;
    if (idempotencyKey) {
      const prior = await razorpay.api.get<
        undefined,
        {
          items: Array<{ notes?: Record<string, unknown> }>;
        }
      >({ url: `/transfers/${transferId}/reversals` });
      if (
        prior.items.some(
          (reversal) => reversal.notes?.refundReversalKey === idempotencyKey
        )
      ) {
        return;
      }
    }
    const data = {
      ...(amountMinor === undefined ? {} : { amount: amountMinor }),
      ...(idempotencyKey
        ? { notes: { refundReversalKey: idempotencyKey } }
        : {}),
    };
    await razorpay.api.post<typeof data, unknown>({
      url: `/transfers/${transferId}/reversals`,
      data,
    });
  }

  private mockCheckout(request: CheckoutRequest): CheckoutSession {
    const providerOrderId = mockId('order', request.orderId);
    const paymentId = mockId('pay', request.orderId);
    return {
      provider: 'RAZORPAY',
      providerOrderId,
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_portfolio_mock',
      amount: request.amountMinor,
      currency: 'INR',
      name: 'Multi-Vendor Storefront (Sandbox)',
      description: request.description,
      prefill: { name: request.shipping.name, contact: request.shipping.phone },
      transfers: request.transfers.map((transfer) => ({
        earningId: transfer.earningId,
        transferId: mockId('trf', `${request.orderId}:${transfer.earningId}`),
      })),
      mockConfirmation: {
        paymentId,
        signature: signatureFor(providerOrderId, paymentId),
      },
    };
  }
}

export const razorpayGateway = new RazorpayGateway();
