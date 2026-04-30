import app from './app';
import { env } from './config/env';
import { prisma, pgPool } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';
import { initializeFirebase } from './utils/fcm';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
    try {
        // $connect() is a no-op with pg.Pool — run a probe query to verify the DB is reachable
        await prisma.$queryRaw`SELECT 1`;
        logger.info('🗄️  Database connected (PostgreSQL + Prisma)');

        // Connect to Redis
        await connectRedis();

        // Initialize Firebase Admin SDK (FCM push notifications)
        initializeFirebase();

        app.listen(env.PORT, () => {
            logger.info(`🚀 Server running on port ${env.PORT}`);
            logger.info(`📍 Environment: ${env.NODE_ENV}`);
            logger.info(`❤️  Health check: http://localhost:${env.PORT}/api/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    await disconnectRedis();
    await prisma.$disconnect();
    await pgPool?.end();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

