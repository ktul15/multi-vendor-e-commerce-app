import Stripe from 'stripe';
import { env } from './env';

// Singleton Stripe client — mirrors the prisma.ts / redis.ts pattern.
// Import this instead of creating per-module instances.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  // Cast required: SDK's type is pinned to its own bundled API version,
  // but a newer date string is valid at runtime.
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
});
