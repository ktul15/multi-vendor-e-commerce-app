import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Known API errors
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors.length > 0 ? err.errors : undefined,
        });
        return;
    }

    // Log unexpected errors
    logger.error('Unexpected error:', {
        name: err.name,
        message: err.message,
        stack: env.isDev ? err.stack : undefined,
    });

    // Generic 500 for unknown errors
    res.status(500).json({
        success: false,
        message: env.isProd ? 'Internal server error' : err.message,
    });
};

export const notFoundHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
