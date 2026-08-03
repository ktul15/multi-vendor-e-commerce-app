import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  generateTokenPair,
  verifyRefreshToken,
  verifyRefreshTokenForRevocation,
} from '../../utils/jwt';
import { ApiError } from '../../utils/apiError';
import { JwtPayload } from '../../types';
import {
  blacklistToken,
  getRefreshRotation,
  rotateRefreshToken,
  waitForRefreshRotation,
} from '../../utils/tokenBlacklist';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'VENDOR';
  storeName?: string;
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
  const { name, email, password, role = 'CUSTOMER', storeName } = input;

  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw ApiError.conflict('Email is already registered');
  }

  // Hash password and create user (+ vendor profile if registering as VENDOR)
  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      ...(role === 'VENDOR' && storeName
        ? {
            vendorProfile: {
              create: { storeName },
            },
          }
        : {}),
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
  refreshToken: string,
  rotationKey?: string
): Promise<AuthTokens> => {
  // A concurrent request may arrive at another API instance just after the
  // winning request consumed this token. Return the same short-lived rotation
  // result instead of falsely logging that browser session out.
  const existingRotation = await getRefreshRotation(refreshToken, rotationKey);
  if (existingRotation) return existingRotation;

  // Verify the refresh token
  let decoded: { userId: string; exp?: number };
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

  const ttl = (decoded.exp ?? 0) - Math.floor(Date.now() / 1000);
  if (ttl <= 0) {
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  // Generate the replacement before entering the atomic Redis operation. Redis
  // either consumes the old token and publishes this exact result, or does
  // neither, so transient failures cannot split those state changes.
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(payload);
  const replacement = verifyRefreshToken(tokens.refreshToken) as {
    userId: string;
    exp: number;
  };
  if (
    !(await rotateRefreshToken(
      refreshToken,
      tokens,
      decoded.exp as number,
      replacement.exp,
      rotationKey
    ))
  ) {
    const concurrentRotation = await waitForRefreshRotation(
      refreshToken,
      rotationKey
    );
    if (concurrentRotation) return concurrentRotation;
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  // Rotate refresh tokens for both web and Flutter clients. The previous token is
  // invalid immediately, while the newly generated token has a unique JWT ID.
  return tokens;
};

/**
 * Logout — blacklist the refresh token so it can't be reused.
 */
export const logout = async (refreshToken: string): Promise<void> => {
  let decoded: { userId: string; exp: number };

  // Expired credentials may still point to a fresh replacement during the
  // bounded rotation window. Verify their signature while ignoring expiration
  // so logout can atomically follow and revoke that link. Invalid signatures
  // remain an idempotent no-op.
  try {
    decoded = verifyRefreshTokenForRevocation(refreshToken);
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return;
    }
    throw error;
  }

  await blacklistToken(refreshToken, decoded.exp);

  // An expired credential is accepted only to follow a still-live rotation
  // link. It must not authorize account/device side effects for a newer session.
  const isCurrentlyValid = decoded.exp > Math.floor(Date.now() / 1000);
  if (decoded.userId && isCurrentlyValid) {
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { fcmToken: null },
    });
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
