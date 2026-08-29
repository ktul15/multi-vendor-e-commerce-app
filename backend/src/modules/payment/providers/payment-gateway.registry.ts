import { PaymentProvider } from '../../../generated/prisma/client';
import { PaymentGateway } from './payment-gateway';
import { razorpayGateway } from './razorpay.gateway';
import { stripeGateway } from './stripe.gateway';

const gateways: Record<PaymentProvider, PaymentGateway> = {
  STRIPE: stripeGateway,
  RAZORPAY: razorpayGateway,
};

export const paymentGatewayFor = (provider: PaymentProvider): PaymentGateway =>
  gateways[provider];
