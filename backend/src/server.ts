import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
    try {
        // Connect to PostgreSQL via Prisma
        await prisma.$connect();
        logger.info('🗄️  Database connected (PostgreSQL + Prisma)');

        // Connect to Redis
        await connectRedis();

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

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    await disconnectRedis();
    await prisma.$disconnect();
    process.exit(0);
});

startServer();

