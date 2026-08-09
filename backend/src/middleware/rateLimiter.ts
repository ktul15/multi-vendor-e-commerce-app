import { createHmac, timingSafeEqual } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';
import { env } from '../config/env';

/**
 * Create a Redis store for rate limiting.
 * Uses ioredis `call` method to send raw Redis commands.
 */
const createRedisStore = (prefix: string) =>
  new RedisStore({
    // @ts-expect-error — ioredis `call` returns Promise<unknown> but rate-limit-redis expects Promise<RedisReply>
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix,
  });

const BFF_IDENTITY_HEADER = 'X-Dashboard-BFF-Identity';
const BFF_CLIENT_HEADER = 'X-Dashboard-BFF-Client';
const BFF_SIGNATURE_HEADER = 'X-Dashboard-BFF-Signature';
const BFF_SOURCE_HEADER = 'X-Dashboard-BFF-Source';
const BFF_TIMESTAMP_HEADER = 'X-Dashboard-BFF-Timestamp';
const BFF_SIGNATURE_MAX_AGE_MS = 30_000;
const BFF_SIGNATURE_CLOCK_SKEW_MS = 5_000;
const trustedIdentityPattern =
  /^(?:account:[a-f0-9]{64}|session:[A-Za-z0-9:_-]{1,200})$/;
const trustedClientPattern = /^client:[a-f0-9]{64}$/;
const trustedSignaturePattern = /^[a-f0-9]{64}$/;

export type TrustedDashboardRateLimitContext = Readonly<{
  client: string;
  identity: string;
  source: 'admin' | 'vendor';
}>;

export function trustedDashboardRateLimitContext(
  req: Request,
  now = Date.now()
): TrustedDashboardRateLimitContext | undefined {
  const client = req.get(BFF_CLIENT_HEADER);
  const identity = req.get(BFF_IDENTITY_HEADER);
  const signature = req.get(BFF_SIGNATURE_HEADER);
  const source = req.get(BFF_SOURCE_HEADER);
  const timestamp = req.get(BFF_TIMESTAMP_HEADER);
  if (
    !client ||
    !identity ||
    !signature ||
    !source ||
    !timestamp ||
    !trustedClientPattern.test(client) ||
    !trustedIdentityPattern.test(identity) ||
    !trustedSignaturePattern.test(signature) ||
    (source !== 'admin' && source !== 'vendor')
  ) {
    return undefined;
  }

  const timestampMs = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampMs) ||
    timestampMs > now + BFF_SIGNATURE_CLOCK_SKEW_MS ||
    now - timestampMs > BFF_SIGNATURE_MAX_AGE_MS
  ) {
    return undefined;
  }

  const pathname = req.originalUrl.split('?')[0];
  const payload = `${timestamp}\n${req.method.toUpperCase()}\n${pathname}\n${source}\n${client}\n${identity}`;
  const expected = createHmac('sha256', env.DASHBOARD_BFF_SECRET)
    .update(payload)
    .digest();
  const received = Buffer.from(signature, 'hex');
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return undefined;
  }
  return { client, identity, source };
}

export function dashboardAwareRateLimitKey(req: Request): string {
  const context = trustedDashboardRateLimitContext(req);
  return context
    ? `dashboard:${context.source}:${context.identity}`
    : ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown');
}

const dashboardClientRateLimitKey = (req: Request): string => {
  const context = trustedDashboardRateLimitContext(req);
  return context ? `${context.source}:${context.client}` : 'untrusted';
};

const dashboardAggregateRateLimitKey = (req: Request): string =>
  trustedDashboardRateLimitContext(req)?.source ?? 'untrusted';

const skipUntrustedDashboardRequest = (req: Request): boolean =>
  !trustedDashboardRateLimitContext(req);

export const createDashboardClientLimiter = (
  max: number,
  distributed = env.isProd,
  prefix = 'rl:dashboard-client:'
) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: dashboardClientRateLimitKey,
    skip: skipUntrustedDashboardRequest,
    message: {
      success: false,
      message: 'Too many dashboard requests, please try again later',
    },
    ...(distributed && { store: createRedisStore(prefix) }),
  });

export const createDashboardAggregateLimiter = (
  max: number,
  distributed = env.isProd,
  prefix = 'rl:dashboard-aggregate:'
) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: dashboardAggregateRateLimitKey,
    skip: skipUntrustedDashboardRequest,
    message: {
      success: false,
      message: 'Dashboard request capacity exceeded, please try again later',
    },
    ...(distributed && { store: createRedisStore(prefix) }),
  });

/**
 * Global API rate limiter.
 * Limits direct clients by IP and authenticated dashboard BFF traffic by a
 * signed per-account or per-session identity.
 * Uses Redis store in production for distributed rate limiting across instances.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isProd ? 100 : 1000, // Generous limit in dev
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  keyGenerator: dashboardAwareRateLimitKey,
  ...(env.isProd && { store: createRedisStore('rl:global:') }),
});

export const dashboardClientLimiter = createDashboardClientLimiter(
  env.isProd ? 300 : 3000
);
export const dashboardAggregateLimiter = createDashboardAggregateLimiter(
  env.isProd ? 10_000 : 100_000
);

/**
 * Strict rate limiter for login and registration endpoints.
 * Direct clients are isolated by IP; dashboard BFF attempts are isolated by
 * an HMAC-authenticated normalized-account digest.
 * Prevents brute-force attacks on passwords and email enumeration.
 */
export const createAuthLimiter = (
  max = env.isProd ? 10 : 100,
  distributed = env.isProd
) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: dashboardAwareRateLimitKey,
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later',
    },
    ...(distributed && { store: createRedisStore('rl:auth:') }),
  });

export const authLimiter = createAuthLimiter();
export const authDashboardClientLimiter = createDashboardClientLimiter(
  env.isProd ? 30 : 300,
  env.isProd,
  'rl:auth-dashboard-client:'
);
export const authDashboardAggregateLimiter = createDashboardAggregateLimiter(
  env.isProd ? 1000 : 10_000,
  env.isProd,
  'rl:auth-dashboard-aggregate:'
);
