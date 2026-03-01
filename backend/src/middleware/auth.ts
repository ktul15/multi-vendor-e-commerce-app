import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';

/**
 * Authentication middleware.
 * Verifies the JWT access token from the Authorization header.
 *
 * Usage: router.get('/profile', authenticate, handler)
 *
 * After this middleware, `req.user` is guaranteed to contain:
 *   { userId, email, role }
 */
export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Access token is required');
        }

        // Extract token: "Bearer <token>" → "<token>"
        const token = authHeader.split(' ')[1];

        if (!token) {
            throw ApiError.unauthorized('Access token is required');
        }

        // Verify and decode the token
        const decoded = verifyAccessToken(token);

        // Attach user info to the request object
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        // Handle specific JWT errors with clear messages
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                next(ApiError.unauthorized('Access token has expired'));
                return;
            }
            if (error.name === 'JsonWebTokenError') {
                next(ApiError.unauthorized('Invalid access token'));
                return;
            }
        }
        next(error);
    }
};

/**
 * Authorization middleware (role-based access control).
 * Must be used AFTER `authenticate` middleware.
 *
 * Usage:
 *   router.patch('/ban', authenticate, authorize('ADMIN'), handler)
 *   router.post('/products', authenticate, authorize('VENDOR', 'ADMIN'), handler)
 *
 * @param allowedRoles - Roles that are permitted to access the route
 */
export const authorize = (...allowedRoles: Array<'CUSTOMER' | 'VENDOR' | 'ADMIN'>) => {
    return (req: AuthRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(ApiError.unauthorized('Authentication required'));
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            next(
                ApiError.forbidden(
                    `Role '${req.user.role}' is not authorized to access this resource`
                )
            );
            return;
        }

        next();
    };
};
