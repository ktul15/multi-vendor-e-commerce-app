import { Response } from 'express';
import { AuthRequest } from '../../types';
import { WishlistService } from './wishlist.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { GetWishlistQueryInput } from './wishlist.validation';

const wishlistService = new WishlistService();

export class WishlistController {
    getWishlist = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const query = req.query as unknown as GetWishlistQueryInput;
        const result = await wishlistService.getWishlist(userId, query);
        ApiResponse.success(res, result, 'Wishlist fetched successfully');
    });

    toggle = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const { productId } = req.body;
        const result = await wishlistService.toggleWishlistItem(userId, productId);

        if (result.action === 'added') {
            ApiResponse.created(res, result, 'Product added to wishlist');
        } else {
            ApiResponse.success(res, result, 'Product removed from wishlist');
        }
    });

    remove = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const productId = req.params.productId as string;
        await wishlistService.removeFromWishlist(userId, productId);
        ApiResponse.noContent(res);
    });
}
