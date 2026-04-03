import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';
import { vendorPayoutService } from './vendor-payout.service';
import {
  GetEarningsQueryInput,
  GetPayoutsQueryInput,
} from './vendor-payout.validation';

export class VendorPayoutController {
  // ─── Connect Onboarding ────────────────────────────────────────────

  onboard = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await vendorPayoutService.createConnectAccount(
      req.user!.userId
    );
    ApiResponse.success(res, result, 'Stripe Connect onboarding URL generated');
  });

  refreshOnboarding = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await vendorPayoutService.refreshOnboardingLink(
      req.user!.userId
    );
    ApiResponse.success(res, result, 'Onboarding link refreshed');
  });

  connectStatus = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await vendorPayoutService.getConnectStatus(
      req.user!.userId
    );
    ApiResponse.success(res, result, 'Connect account status');
  });

  // ─── Earnings & Payouts ───────────────────────────────────────────

  earnings = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await vendorPayoutService.getEarnings(
      req.vendorProfile!.id,
      req.query as unknown as GetEarningsQueryInput
    );
    ApiResponse.success(res, result, 'Earnings retrieved');
  });

  earningsSummary = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await vendorPayoutService.getEarningsSummary(
      req.vendorProfile!.id
    );
    ApiResponse.success(res, result, 'Earnings summary retrieved');
  });

  payouts = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await vendorPayoutService.getPayouts(
      req.vendorProfile!.id,
      req.query as unknown as GetPayoutsQueryInput
    );
    ApiResponse.success(res, result, 'Payouts retrieved');
  });

  // ─── Admin ────────────────────────────────────────────────────────

  updateCommissionRate = catchAsync(async (req: AuthRequest, res: Response) => {
    const vendorId = req.params.vendorId as string;
    const { commissionRate } = req.body;
    const result = await vendorPayoutService.updateCommissionRate(
      vendorId,
      commissionRate
    );
    ApiResponse.success(res, result, 'Commission rate updated');
  });

  // ─── Connect Webhook ──────────────────────────────────────────────

  webhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) throw ApiError.badRequest('Missing Stripe-Signature header');
    if (!req.rawBody) throw ApiError.badRequest('Raw body unavailable');

    await vendorPayoutService.handleConnectWebhook(req.rawBody, signature);

    res.status(200).json({ received: true });
  });
}
