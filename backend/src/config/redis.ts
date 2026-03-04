import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Redis client singleton.
 * Used for token blacklisting, caching, and rate limiting.
 */
export const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
    },
    lazyConnect: true,
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
    logger.info('🔴 Redis connected');
});

/**
 * Connect to Redis. Called during server startup.
 */
export const connectRedis = async (): Promise<void> => {
    try {
        await redis.connect();
    } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        // Redis is optional — server can still run without it
        // Token blacklisting and caching will be unavailable
    }
};

/**
 * Disconnect from Redis. Called during graceful shutdown.
 */
export const disconnectRedis = async (): Promise<void> => {
    await redis.quit();
};
