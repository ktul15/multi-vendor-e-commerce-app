import type Stripe from 'stripe';
import { stripe } from '../../../config/stripe';
import {
  CheckoutRequest,
  CheckoutSession,
  PaymentGateway,
  RefundResult,
} from './payment-gateway';

const REUSABLE_INTENT_STATUSES: Stripe.PaymentIntent.Status[] = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
];

const intentDetails = (request: CheckoutRequest) => ({
  description: request.description,
  shipping: {
    name: request.shipping.name,
    phone: request.shipping.phone,
    address: {
      line1: request.shipping.address.line1,
      city: request.shipping.address.city,
      state: request.shipping.address.state,
      country: request.shipping.address.country,
      postal_code: request.shipping.address.postalCode,
    },
  },
});

export class StripeGateway implements PaymentGateway {
  readonly provider = 'STRIPE' as const;

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const intent = await stripe.paymentIntents.create(
      {
        amount: request.amountMinor,
        currency: request.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        ...intentDetails(request),
        transfer_group: request.orderId,
        metadata: { orderId: request.orderId, userId: request.userId },
      },
      { idempotencyKey: request.idempotencyKey }
    );
    if (!intent.client_secret) {
      throw new Error('Stripe did not return a PaymentIntent client secret');
    }
    return {
      provider: 'STRIPE',
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret,
    };
  }

  async reuseCheckout(
    providerReference: string,
    request: CheckoutRequest
  ): Promise<CheckoutSession | null> {
    const existing = await stripe.paymentIntents.retrieve(providerReference);
    if (!REUSABLE_INTENT_STATUSES.includes(existing.status)) return null;
    const updated = await stripe.paymentIntents.update(
      existing.id,
      intentDetails(request)
    );
    if (!updated.client_secret) return null;
    return {
      provider: 'STRIPE',
      providerPaymentId: updated.id,
      clientSecret: updated.client_secret,
    };
  }

  async cancel(providerReference: string): Promise<void> {
    await stripe.paymentIntents.cancel(providerReference);
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
    const transfer = await stripe.transfers.create(
      {
        amount: input.transfer.amountMinor,
        currency: 'inr',
        destination: input.transfer.accountId,
        transfer_group: input.orderId,
        metadata: {
          vendorEarningId: input.transfer.earningId,
          vendorOrderId: input.transfer.vendorOrderId,
        },
      },
      { idempotencyKey: `earning_${input.transfer.earningId}` }
    );
    return transfer.id;
  }

  async refund(input: {
    paymentId: string;
    amountMinor: number;
    isFullRefund: boolean;
    receipt: string;
    idempotencyKey: string;
  }): Promise<RefundResult> {
    const refund = await stripe.refunds.create(
      {
        payment_intent: input.paymentId,
        amount: input.amountMinor,
        metadata: { receipt: input.receipt },
      },
      { idempotencyKey: input.idempotencyKey }
    );
    return {
      refundId: refund.id,
      status:
        refund.status === 'succeeded'
          ? 'SUCCEEDED'
          : ['failed', 'canceled'].includes(refund.status ?? '')
            ? 'FAILED'
            : 'PENDING',
    };
  }

  async reverseTransfer(
    transferId: string,
    amountMinor?: number,
    idempotencyKey?: string
  ): Promise<void> {
    await stripe.transfers.createReversal(
      transferId,
      amountMinor === undefined ? undefined : { amount: amountMinor },
      idempotencyKey ? { idempotencyKey } : undefined
    );
  }
}

export const stripeGateway = new StripeGateway();
