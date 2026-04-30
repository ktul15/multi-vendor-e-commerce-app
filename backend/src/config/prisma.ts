import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

// Prisma Client singleton
// In development, hot-reload would create multiple instances.
// This pattern reuses the same instance across restarts.

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pgPool: pg.Pool | undefined;
};

function createPrismaClient(): PrismaClient {
    const pool = new pg.Pool({
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
    });
    // Forward pool-level errors so they surface as startup failures
    // rather than unhandled EventEmitter exceptions
    pool.on('error', (err) => {
        logger.error('Unexpected pg.Pool error:', err);
    });
    globalForPrisma.pgPool = pool;
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
        adapter,
        log: env.isDev ? ['query', 'warn', 'error'] : ['error'],
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export const pgPool = globalForPrisma.pgPool;

if (!env.isProd) {
    globalForPrisma.prisma = prisma;
}
