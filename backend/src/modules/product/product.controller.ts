import { Request, Response } from 'express';
import { AuthRequest } from '../../types';
import { ProductService } from './product.service';
import catchAsync from '../../utils/catchAsync';
import { ApiResponse } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import {
  GetProductQueryInput,
  SearchProductQueryInput,
  VendorInventoryQueryInput,
} from './product.validation';

const productService = new ProductService();

export class ProductController {
  getProducts = catchAsync(async (req: AuthRequest, res: Response) => {
    // validateQuery middleware has already coerced and validated req.query;
    // the double cast is required because Express types req.query as ParsedQs
    const queryParams = req.query as unknown as GetProductQueryInput;
    const productsPaginated = await productService.getProducts(queryParams);
    ApiResponse.success(
      res,
      productsPaginated,
      'Products fetched successfully'
    );
  });

  searchProducts = catchAsync(async (req: AuthRequest, res: Response) => {
    // Dedicated search endpoint: supports keyword + pagination + sort only.
    // For full filter support (price, category, vendor, rating, inStock) use GET /
    const queryParams = req.query as unknown as SearchProductQueryInput;
    const productsPaginated = await productService.getProducts({
      search: queryParams.q,
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    });
    ApiResponse.success(
      res,
      productsPaginated,
      'Products searched successfully'
    );
  });

  getProductById = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const product = await productService.getProductById(id);
    ApiResponse.success(res, product, 'Product fetched successfully');
  });

  getVendorInventory = catchAsync(async (req: AuthRequest, res: Response) => {
    const inventory = await productService.getVendorInventory(
      req.user!.userId,
      req.query as unknown as VendorInventoryQueryInput
    );
    ApiResponse.success(
      res,
      inventory,
      'Vendor inventory fetched successfully'
    );
  });

  createProduct = catchAsync(async (req: AuthRequest, res: Response) => {
    const vendorId = req.user!.userId;
    const newProduct = await productService.createProduct(vendorId, req.body);
    ApiResponse.created(res, newProduct, 'Product created successfully');
  });

  updateProduct = catchAsync(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const vendorId = req.user!.userId;
    const updatedProduct = await productService.updateProduct(
      id,
      vendorId,
      req.body
    );
    ApiResponse.success(res, updatedProduct, 'Product updated successfully');
  });

  deleteProduct = catchAsync(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const vendorId = req.user!.userId;
    await productService.deleteProduct(id, vendorId);
    ApiResponse.success(res, null, 'Product deleted successfully');
  });

  uploadMedia = catchAsync(async (req: AuthRequest, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const media = await productService.uploadProductMedia(
      req.params.id as string,
      req.user!.userId,
      files
    );
    ApiResponse.created(res, media, 'Product media uploaded successfully');
  });

  replaceMedia = catchAsync(async (req: AuthRequest, res: Response) => {
    if (!req.file) throw ApiError.badRequest('Image is required');
    const media = await productService.replaceProductMedia(
      req.params.id as string,
      req.params.mediaId as string,
      req.user!.userId,
      req.file
    );
    ApiResponse.success(res, media, 'Product media replaced successfully');
  });

  removeMedia = catchAsync(async (req: AuthRequest, res: Response) => {
    const media = await productService.removeProductMedia(
      req.params.id as string,
      req.params.mediaId as string,
      req.user!.userId
    );
    ApiResponse.success(res, media, 'Product media removed successfully');
  });

  /**
   * VENDOR Variant management
   */
  addVariant = catchAsync(async (req: AuthRequest, res: Response) => {
    const productId = req.params.id as string;
    const vendorId = req.user!.userId;
    const newVariant = await productService.addVariant(
      productId,
      vendorId,
      req.body
    );
    ApiResponse.created(res, newVariant, 'Variant added successfully');
  });

  updateVariant = catchAsync(async (req: AuthRequest, res: Response) => {
    const productId = req.params.id as string;
    const variantId = req.params.vid as string;
    const vendorId = req.user!.userId;
    const updatedVariant = await productService.updateVariant(
      productId,
      variantId,
      vendorId,
      req.body
    );
    ApiResponse.success(res, updatedVariant, 'Variant updated successfully');
  });

  deleteVariant = catchAsync(async (req: AuthRequest, res: Response) => {
    const productId = req.params.id as string;
    const variantId = req.params.vid as string;
    await productService.deleteVariant(productId, variantId, req.user!.userId);
    ApiResponse.success(res, null, 'Variant deleted successfully');
  });
}
