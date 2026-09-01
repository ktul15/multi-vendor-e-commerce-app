import { PaymentProvider } from '../../../generated/prisma/client';

export type ProviderTransferRequest = Readonly<{
  accountId: string;
  amountMinor: number;
  earningId: string;
  vendorOrderId: string;
}>;

export type ProviderTransferResult = Readonly<{
  earningId: string;
  transferId: string;
}>;

export type CheckoutRequest = Readonly<{
  orderId: string;
  orderNumber: string;
  idempotencyKey: string;
  userId: string;
  amountMinor: number;
  currency: 'INR';
  description: string;
  shipping: {
    name: string;
    phone: string;
    address: {
      line1: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  transfers: ProviderTransferRequest[];
}>;

export type CheckoutSession =
  | Readonly<{
      provider: 'STRIPE';
      providerPaymentId: string;
      clientSecret: string;
    }>
  | Readonly<{
      provider: 'RAZORPAY';
      providerOrderId: string;
      keyId: string;
      amount: number;
      currency: 'INR';
      name: string;
      description: string;
      prefill: { name: string; contact: string };
      transfers: ProviderTransferResult[];
      mockConfirmation?: {
        paymentId: string;
        signature: string;
      };
    }>;

export type RefundResult = Readonly<{
  refundId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
}>;

export interface PaymentGateway {
  readonly provider: PaymentProvider;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  reuseCheckout(
    providerReference: string,
    request: CheckoutRequest
  ): Promise<CheckoutSession | null>;
  cancel(providerReference: string): Promise<void>;
  createTransfer(input: {
    paymentId: string;
    orderId: string;
    transfer: ProviderTransferRequest;
  }): Promise<string>;
  refund(input: {
    paymentId: string;
    amountMinor: number;
    isFullRefund: boolean;
    receipt: string;
    idempotencyKey: string;
  }): Promise<RefundResult>;
  reverseTransfer(
    transferId: string,
    amountMinor?: number,
    idempotencyKey?: string
  ): Promise<void>;
}
