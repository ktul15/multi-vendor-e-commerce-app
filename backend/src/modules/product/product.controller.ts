import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { ProductService } from './product.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';

const productService = new ProductService();

export class ProductController {
    getProducts = catchAsync(async (req: Request, res: Response) => {
        // Will expand with query pagination/filters in Issue 21
        const { vendorId, categoryId } = req.query as { vendorId?: string; categoryId?: string };
        const products = await productService.getProducts({ vendorId, categoryId });
        ApiResponse.success(res, products, 'Products fetched successfully');
    });

    getProductById = catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const product = await productService.getProductById(id);
        ApiResponse.success(res, product, 'Product fetched successfully');
    });

    createProduct = catchAsync(async (req: AuthRequest, res: Response) => {
        const vendorId = req.user!.userId;
        const newProduct = await productService.createProduct(vendorId, req.body);
        ApiResponse.created(res, newProduct, 'Product created successfully');
    });

    updateProduct = catchAsync(async (req: AuthRequest, res: Response) => {
        const id = req.params.id as string;
        const vendorId = req.user!.userId;
        const updatedProduct = await productService.updateProduct(id, vendorId, req.body);
        ApiResponse.success(res, updatedProduct, 'Product updated successfully');
    });

    deleteProduct = catchAsync(async (req: AuthRequest, res: Response) => {
        const id = req.params.id as string;
        const vendorId = req.user!.userId;
        await productService.deleteProduct(id, vendorId);
        ApiResponse.success(res, null, 'Product deleted successfully');
    });

    /**
     * VENDOR Variant management
     */
    addVariant = catchAsync(async (req: AuthRequest, res: Response) => {
        const productId = req.params.id as string;
        const vendorId = req.user!.userId;
        const newVariant = await productService.addVariant(productId, vendorId, req.body);
        ApiResponse.created(res, newVariant, 'Variant added successfully');
    });

    updateVariant = catchAsync(async (req: AuthRequest, res: Response) => {
        const productId = req.params.id as string;
        const variantId = req.params.vid as string;
        const vendorId = req.user!.userId;
        const updatedVariant = await productService.updateVariant(productId, variantId, vendorId, req.body);
        ApiResponse.success(res, updatedVariant, 'Variant updated successfully');
    });
}
