import Razorpay from 'razorpay';
import { env } from './env';

if (env.isProd && env.RAZORPAY_SANDBOX_MOCK) {
  throw new Error('RAZORPAY_SANDBOX_MOCK cannot be enabled in production');
}
if (!env.RAZORPAY_SANDBOX_MOCK && !env.RAZORPAY_WEBHOOK_SECRET) {
  throw new Error(
    'RAZORPAY_WEBHOOK_SECRET is required when Razorpay sandbox mock mode is disabled'
  );
}
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || 'rzp_test_portfolio_mock',
  key_secret: env.RAZORPAY_KEY_SECRET || 'sandbox-mock-secret',
});
