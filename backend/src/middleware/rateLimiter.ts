import rateLimit from 'express-rate-limit';
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

/**
 * Global API rate limiter.
 * Limits each IP to 100 requests per 15 minutes.
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
    ...(env.isProd && { store: createRedisStore('rl:global:') }),
});

/**
 * Strict rate limiter for auth endpoints.
 * Limits each IP to 10 login/register attempts per 15 minutes.
 * Prevents brute-force attacks on passwords and email enumeration.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.isProd ? 10 : 100, // Tight in prod, loose in dev
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later',
    },
    ...(env.isProd && { store: createRedisStore('rl:auth:') }),
});
