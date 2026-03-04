import { redis } from '../config/redis';
import { logger } from './logger';

const BLACKLIST_PREFIX = 'bl:';

/**
 * Blacklist a refresh token.
 * Called on logout to prevent the token from being reused.
 *
 * @param token - The refresh token to blacklist
 * @param expiresInSeconds - TTL matching the token's remaining lifetime
 */
export const blacklistToken = async (
    token: string,
    expiresInSeconds: number
): Promise<void> => {
    try {
        await redis.set(
            `${BLACKLIST_PREFIX}${token}`,
            '1',
            'EX',
            expiresInSeconds
        );
    } catch (error) {
        // Log but don't throw — if Redis is down, logout still works
        // (client discards tokens), just can't prevent reuse
        logger.error('Failed to blacklist token:', error);
    }
};

/**
 * Check if a refresh token has been blacklisted.
 *
 * @param token - The refresh token to check
 * @returns true if blacklisted, false otherwise
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    try {
        const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
        return result !== null;
    } catch (error) {
        // If Redis is down, assume not blacklisted (fail open)
        logger.error('Failed to check token blacklist:', error);
        return false;
    }
};
