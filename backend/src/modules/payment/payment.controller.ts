import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';
import { paymentService } from './payment.service';

export class PaymentController {
    createIntent = catchAsync(async (req: AuthRequest, res: Response) => {
        const result = await paymentService.createPaymentIntent(req.user!.userId, req.body);
        ApiResponse.created(res, result, 'Payment intent created');
    });

    webhook = catchAsync(async (req: Request, res: Response) => {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) throw ApiError.badRequest('Missing Stripe-Signature header');
        if (!req.rawBody) throw ApiError.badRequest('Raw body unavailable');

        await paymentService.handleWebhook(req.rawBody, signature);

        // Stripe requires a fast 2xx with this exact shape to mark the delivery as successful
        res.status(200).json({ received: true });
    });
}
