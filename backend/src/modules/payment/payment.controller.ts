import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';
import { paymentService } from './payment.service';

export class PaymentController {
  createIntent = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await paymentService.createCheckout(
      req.user!.userId,
      req.body
    );
    ApiResponse.created(res, result, 'Payment checkout created');
  });

  confirmRazorpay = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await paymentService.confirmRazorpayPayment(
      req.user!.userId,
      req.body
    );
    ApiResponse.success(res, result, 'Razorpay payment signature verified');
  });

  webhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature)
      throw ApiError.badRequest('Missing Stripe-Signature header');
    if (!req.rawBody) throw ApiError.badRequest('Raw body unavailable');

    await paymentService.handleWebhook(req.rawBody, signature);

    // Stripe requires a fast 2xx with this exact shape to mark the delivery as successful
    res.status(200).json({ received: true });
  });

  razorpayWebhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'];
    if (typeof signature !== 'string') {
      throw ApiError.badRequest('Missing X-Razorpay-Signature header');
    }
    if (typeof eventId !== 'string' || eventId.length > 200) {
      throw ApiError.badRequest(
        'Missing or invalid X-Razorpay-Event-Id header'
      );
    }
    if (!req.rawBody) throw ApiError.badRequest('Raw body unavailable');
    await paymentService.handleRazorpayWebhook(req.rawBody, signature, eventId);
    res.status(200).json({ received: true });
  });

  refund = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await paymentService.refundPayment(
      req.params.paymentId as string,
      req.body.amount,
      req.body.reason
    );
    ApiResponse.success(res, result, 'Refund initiated');
  });
}
