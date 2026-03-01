import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

/**
 * Generate an access token (short-lived).
 * Contains: userId, email, role
 */
export const generateAccessToken = (payload: JwtPayload): string => {
    const options: SignOptions = {
        expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Generate a refresh token (long-lived).
 * Contains: userId only (minimal data)
 */
export const generateRefreshToken = (userId: string): string => {
    const options: SignOptions = {
        expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, options);
};

/**
 * Generate both access and refresh tokens.
 */
export const generateTokenPair = (
    payload: JwtPayload
): { accessToken: string; refreshToken: string } => {
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload.userId),
    };
};

/**
 * Verify an access token and return the decoded payload.
 * Throws if the token is expired or invalid.
 */
export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
};

/**
 * Verify a refresh token and return the decoded payload.
 * Throws if the token is expired or invalid.
 */
export const verifyRefreshToken = (
    token: string
): { userId: string } => {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
};
