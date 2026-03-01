import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt';
import { ApiError } from '../../utils/apiError';
import { JwtPayload } from '../../types';

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
    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);

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
