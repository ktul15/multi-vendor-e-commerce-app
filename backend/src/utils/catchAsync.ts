import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async express controllers to catch and pass errors to the global error handler
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch((err) => next(err));
    };
};

export default catchAsync;
