import { Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';
import { bannerService } from './banner.service';
import {
  CreateBannerInput,
  UpdateBannerInput,
  ListBannersQueryInput,
} from './banner.validation';

export class BannerController {
  getPublicBanners = catchAsync(async (_req: AuthRequest, res: Response) => {
    const banners = await bannerService.getPublicBanners();
    ApiResponse.success(res, banners, 'Banners retrieved');
  });

  listBanners = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await bannerService.listBanners(
      req.query as unknown as ListBannersQueryInput
    );
    ApiResponse.success(res, result, 'Banners retrieved');
  });

  getBannerById = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const banner = await bannerService.getBannerById(id);
    ApiResponse.success(res, banner, 'Banner retrieved');
  });

  createBanner = catchAsync(async (req: AuthRequest, res: Response) => {
    const banner = await bannerService.createBanner(
      req.body as CreateBannerInput,
      req.file
    );
    ApiResponse.created(res, banner, 'Banner created');
  });

  updateBanner = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const banner = await bannerService.updateBanner(
      id,
      req.body as UpdateBannerInput,
      req.file
    );
    ApiResponse.success(res, banner, 'Banner updated');
  });

  deleteBanner = catchAsync(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    await bannerService.deleteBanner(id);
    ApiResponse.noContent(res);
  });
}
