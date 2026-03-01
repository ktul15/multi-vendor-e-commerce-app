import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import * as authService from './auth.service';

/**
 * POST /api/v1/auth/register
 */
export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            throw ApiError.badRequest('Name, email, and password are required');
        }

        if (password.length < 6) {
            throw ApiError.badRequest('Password must be at least 6 characters');
        }

        const result = await authService.register({ name, email, password });

        ApiResponse.created(res, result, 'Registration successful');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/login
 */
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw ApiError.badRequest('Email and password are required');
        }

        const result = await authService.login({ email, password });

        ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw ApiError.badRequest('Refresh token is required');
        }

        const tokens = await authService.refreshAccessToken(refreshToken);

        ApiResponse.success(res, tokens, 'Token refreshed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/logout
 * For now, logout is handled client-side by discarding tokens.
 * When Redis is set up (Issue #9), we'll add token blacklisting here.
 */
export const logout = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // TODO: Invalidate refresh token in Redis (Issue #9)
        ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/auth/profile
 * Protected route — requires authenticate middleware
 */
export const getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            throw ApiError.unauthorized('Authentication required');
        }

        const profile = await authService.getProfile(req.user.userId);

        ApiResponse.success(res, profile, 'Profile fetched successfully');
    } catch (error) {
        next(error);
    }
};
