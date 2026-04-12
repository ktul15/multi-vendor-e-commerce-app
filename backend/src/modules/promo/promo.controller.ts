import { Response } from 'express';
import { AuthRequest } from '../../types';
import { PromoService } from './promo.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { GetPromosQueryInput } from './promo.validation';

const promoService = new PromoService();

export class PromoController {
  create = catchAsync(async (req: AuthRequest, res: Response) => {
    const promo = await promoService.createPromo(req.body);
    ApiResponse.created(res, promo, 'Promo code created successfully');
  });

  getAll = catchAsync(async (req: AuthRequest, res: Response) => {
    const query = req.query as unknown as GetPromosQueryInput;
    const result = await promoService.getPromos(query);
    ApiResponse.success(res, result, 'Promo codes fetched successfully');
  });

  getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const promo = await promoService.getPromoById(req.params.id as string);
    ApiResponse.success(res, promo, 'Promo code fetched successfully');
  });

  update = catchAsync(async (req: AuthRequest, res: Response) => {
    const promo = await promoService.updatePromo(
      req.params.id as string,
      req.body
    );
    ApiResponse.success(res, promo, 'Promo code updated successfully');
  });

  delete = catchAsync(async (req: AuthRequest, res: Response) => {
    const promo = await promoService.deletePromo(req.params.id as string);
    ApiResponse.success(res, promo, 'Promo code deactivated successfully');
  });
}
