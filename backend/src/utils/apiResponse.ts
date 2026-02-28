import { Response } from 'express';
import { ApiResponseBody } from '../types';

export class ApiResponse {
    static success<T>(
        res: Response,
        data: T,
        message = 'Success',
        statusCode = 200
    ): Response {
        const body: ApiResponseBody<T> = {
            success: true,
            message,
            data,
        };
        return res.status(statusCode).json(body);
    }

    static created<T>(res: Response, data: T, message = 'Created'): Response {
        return ApiResponse.success(res, data, message, 201);
    }

    static noContent(res: Response): Response {
        return res.status(204).send();
    }

    static error(
        res: Response,
        statusCode: number,
        message: string,
        errors: Array<{ field?: string; message: string }> = []
    ): Response {
        const body: ApiResponseBody = {
            success: false,
            message,
            errors: errors.length > 0 ? errors : undefined,
        };
        return res.status(statusCode).json(body);
    }
}
