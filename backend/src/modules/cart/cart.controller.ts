import { Response } from 'express';
import { AuthRequest } from '../../types';
import { CartService } from './cart.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { AddCartItemInput, UpdateCartItemInput, PreviewPromoInput } from './cart.validation';

const cartService = new CartService();

export class CartController {
    getCart = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const cart = await cartService.getCart(userId);
        ApiResponse.success(res, cart, 'Cart fetched successfully');
    });

    addItem = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const input = req.body as AddCartItemInput;
        const cart = await cartService.addItem(userId, input);
        ApiResponse.created(res, cart, 'Item added to cart');
    });

    updateItem = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const itemId = req.params.itemId as string;
        const input = req.body as UpdateCartItemInput;
        const cart = await cartService.updateItem(userId, itemId, input);
        ApiResponse.success(res, cart, 'Cart item updated');
    });

    removeItem = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const itemId = req.params.itemId as string;
        const cart = await cartService.removeItem(userId, itemId);
        ApiResponse.success(res, cart, 'Item removed from cart');
    });

    clearCart = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        await cartService.clearCart(userId);
        ApiResponse.success(res, null, 'Cart cleared');
    });

    previewPromo = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const { code } = req.body as PreviewPromoInput;
        const result = await cartService.previewPromo(userId, code);
        ApiResponse.success(res, result, 'Promo code preview calculated');
    });
}
