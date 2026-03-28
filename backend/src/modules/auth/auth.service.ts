import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt';
import { ApiError } from '../../utils/apiError';
import { JwtPayload } from '../../types';
import { blacklistToken, isTokenBlacklisted } from '../../utils/tokenBlacklist';

interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    isVerified: boolean;
    createdAt: Date;
}

/**
 * Register a new user account.
 */
export const register = async (
    input: RegisterInput
): Promise<{ user: UserProfile; tokens: AuthTokens }> => {
    const { name, email, password } = input;

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw ApiError.conflict('Email is already registered');
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    // Generate tokens
    const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const tokens = generateTokenPair(payload);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
        },
        tokens,
    };
};

/**
 * Login with email and password.
 */
export const login = async (
    input: LoginInput
): Promise<{ user: UserProfile; tokens: AuthTokens }> => {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    // Check if user is banned
    if (user.isBanned) {
        throw ApiError.forbidden('Your account has been suspended');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const tokens = generateTokenPair(payload);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
        },
        tokens,
    };
};

/**
 * Refresh the access token using a valid refresh token.
 */
export const refreshAccessToken = async (
    refreshToken: string
): Promise<AuthTokens> => {
    // Check if the refresh token has been blacklisted (e.g. after logout)
    const blacklisted = await isTokenBlacklisted(refreshToken);
    if (blacklisted) {
        throw ApiError.unauthorized('Refresh token has been revoked');
    }

    // Verify the refresh token
    let decoded: { userId: string };
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                throw ApiError.unauthorized('Refresh token has expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw ApiError.unauthorized('Invalid refresh token');
            }
        }
        throw ApiError.unauthorized('Invalid refresh token');
    }

    // Find the user to ensure they still exist and aren't banned
    const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
    });

    if (!user) {
        throw ApiError.unauthorized('User no longer exists');
    }

    if (user.isBanned) {
        throw ApiError.forbidden('Your account has been suspended');
    }

    // Generate new token pair
    const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };

    return generateTokenPair(payload);
};

/**
 * Logout — blacklist the refresh token so it can't be reused.
 */
export const logout = async (refreshToken: string): Promise<void> => {
    // Verify the token to get its expiry, then blacklist for remaining TTL
    try {
        const decoded = verifyRefreshToken(refreshToken) as { userId: string; exp: number };
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;
        if (ttl > 0) {
            await blacklistToken(refreshToken, ttl);
        }
        // Clear FCM token so the device stops receiving push notifications
        if (decoded.userId) {
            await prisma.user.update({
                where: { id: decoded.userId },
                data: { fcmToken: null },
            });
        }
    } catch {
        // If token is already expired or invalid, no need to blacklist
    }
};

/**
 * Get the current user's profile.
 */
export const getProfile = async (userId: string): Promise<UserProfile> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
    };
};
