import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user info from JWT
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
    };
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
