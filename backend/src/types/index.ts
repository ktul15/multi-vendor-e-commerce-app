import { Request, Response, NextFunction } from 'express';

// JWT token payload — stored inside access & refresh tokens
export interface JwtPayload {
    userId: string;
    email: string;
    role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
}

// Extend Express Request to include user info from JWT
export interface AuthRequest extends Request {
    user?: JwtPayload;
}

// Standard API response shape
export interface ApiResponseBody<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Array<{
        field?: string;
        message: string;
    }>;
}

// Async handler type
export type AsyncHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

