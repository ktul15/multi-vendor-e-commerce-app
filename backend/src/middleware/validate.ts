import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/apiError';

/**
 * Validation middleware factory.
 * Validates req.body against a Zod schema.
 *
 * Usage: router.post('/register', validate(registerSchema), controller.register)
 *
 * On validation failure, returns 400 with structured field-level errors:
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "email", "message": "Invalid email address" },
 *     { "field": "password", "message": "Password must be at least 6 characters" }
 *   ]
 * }
 */
export const validate = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            // Zod v4: issues array instead of errors
            const issues = 'issues' in result.error ? result.error.issues : [];
            const fieldErrors = issues.map((issue) => ({
                field: issue.path.map(String).join('.'),
                message: issue.message,
            }));
            next(ApiError.badRequest('Validation failed', fieldErrors));
            return;
        }

        // Replace req.body with the validated + transformed data
        req.body = result.data;
        next();
    };
};

/**
 * Validates req.params against a Zod schema.
 */
export const validateParams = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const issues = 'issues' in result.error ? result.error.issues : [];
            const fieldErrors = issues.map((issue) => ({
                field: issue.path.map(String).join('.'),
                message: issue.message,
            }));
            next(ApiError.badRequest('Invalid route parameter', fieldErrors));
            return;
        }

        req.params = result.data as Record<string, string>;
        next();
    };
};

/**
 * Validates req.query against a Zod schema.
 */
export const validateQuery = (schema: z.ZodType) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const issues = 'issues' in result.error ? result.error.issues : [];
            const fieldErrors = issues.map((issue) => ({
                field: issue.path.map(String).join('.'),
                message: issue.message,
            }));
            next(ApiError.badRequest('Query validation failed', fieldErrors));
            return;
        }

        // Replace req.query safely by defining the property (bypassing Express getter)
        Object.defineProperty(req, 'query', {
            value: result.data,
            writable: true,
            enumerable: true,
            configurable: true
        });
        next();
    };
};
