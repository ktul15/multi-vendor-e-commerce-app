import { Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';
import { analyticsService } from './analytics.service';
import {
  SummaryQueryInput,
  SalesQueryInput,
  TopProductsQueryInput,
} from './analytics.validation';

export class AnalyticsController {
  summary = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await analyticsService.getSummary(
      req.user!.userId,
      req.vendorProfile!.id,
      req.query as unknown as SummaryQueryInput
    );
    ApiResponse.success(res, result, 'Analytics summary retrieved');
  });

  sales = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await analyticsService.getSales(
      req.user!.userId,
      req.query as unknown as SalesQueryInput
    );
    ApiResponse.success(res, result, 'Sales data retrieved');
  });

  topProducts = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await analyticsService.getTopProducts(
      req.user!.userId,
      req.query as unknown as TopProductsQueryInput
    );
    ApiResponse.success(res, result, 'Top products retrieved');
  });
}
