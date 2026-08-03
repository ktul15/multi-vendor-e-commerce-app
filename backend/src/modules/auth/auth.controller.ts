import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import * as authService from './auth.service';
import {
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  isCookieAuthRequest,
  readCookie,
  setAuthCookies,
} from './auth.cookies';

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
    if (isCookieAuthRequest(req)) {
      setAuthCookies(res, result.tokens);
      ApiResponse.created(
        res,
        { user: result.user },
        'Registration successful'
      );
      return;
    }
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
    if (isCookieAuthRequest(req)) {
      setAuthCookies(res, result.tokens);
      ApiResponse.success(res, { user: result.user }, 'Login successful');
      return;
    }
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
    const cookieToken = readCookie(req, REFRESH_COOKIE_NAME);
    const refreshToken = cookieToken ?? req.body?.refreshToken;
    if (!refreshToken) throw ApiError.badRequest('Refresh token is required');

    const rotationKey =
      req.get('X-Refresh-Rotation-Key') ?? readCookie(req, CSRF_COOKIE_NAME);
    const tokens = await authService.refreshAccessToken(
      refreshToken,
      rotationKey
    );
    if (cookieToken || isCookieAuthRequest(req)) {
      setAuthCookies(res, tokens);
      ApiResponse.success(res, null, 'Token refreshed successfully');
      return;
    }
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
    const refreshToken =
      readCookie(req, REFRESH_COOKIE_NAME) ?? req.body?.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearAuthCookies(res);
    ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    clearAuthCookies(res);
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
