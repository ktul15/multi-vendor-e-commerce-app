import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import * as authService from './auth.service';

/**
 * POST /api/v1/auth/register
 * Body is pre-validated by Zod middleware
 */
export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.register(req.body);
        ApiResponse.created(res, result, 'Registration successful');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/login
 * Body is pre-validated by Zod middleware
 */
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await authService.login(req.body);
        ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/refresh
 * Body is pre-validated by Zod middleware
 */
export const refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const tokens = await authService.refreshAccessToken(req.body.refreshToken);
        ApiResponse.success(res, tokens, 'Token refreshed successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/logout
 * Blacklists the refresh token in Redis so it can't be reused.
 * Body is pre-validated by Zod middleware.
 */
export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const refreshToken = req.body?.refreshToken;
        if (refreshToken) {
            await authService.logout(refreshToken);
        }
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
