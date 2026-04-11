import { Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';
import { adminService } from './admin.service';
import {
  ListUsersQueryInput,
  ListVendorsQueryInput,
  ListProductsQueryInput,
  ListOrdersQueryInput,
  RevenueQueryInput,
  UpdateCommissionInput,
  UpdateVendorCommissionInput,
} from './admin.validation';

export class AdminController {
  // ---- Dashboard ----

  getDashboard = catchAsync(async (_req: AuthRequest, res: Response) => {
    const stats = await adminService.getDashboardStats();
    ApiResponse.success(res, stats, 'Dashboard stats retrieved');
  });

  // ---- Users ----

  listUsers = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await adminService.listUsers(
      req.query as unknown as ListUsersQueryInput
    );
    ApiResponse.success(res, result, 'Users retrieved');
  });

  banUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params as { userId: string };
    const user = await adminService.banUser(userId);
    ApiResponse.success(res, user, 'User banned successfully');
  });

  unbanUser = catchAsync(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params as { userId: string };
    const user = await adminService.unbanUser(userId);
    ApiResponse.success(res, user, 'User unbanned successfully');
  });

  // ---- Vendors ----

  listVendors = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await adminService.listVendors(
      req.query as unknown as ListVendorsQueryInput
    );
    ApiResponse.success(res, result, 'Vendors retrieved');
  });

  approveVendor = catchAsync(async (req: AuthRequest, res: Response) => {
    const { vendorProfileId } = req.params as { vendorProfileId: string };
    const profile = await adminService.approveVendor(vendorProfileId);
    ApiResponse.success(res, profile, 'Vendor approved successfully');
  });

  rejectVendor = catchAsync(async (req: AuthRequest, res: Response) => {
    const { vendorProfileId } = req.params as { vendorProfileId: string };
    const profile = await adminService.rejectVendor(vendorProfileId);
    ApiResponse.success(res, profile, 'Vendor rejected successfully');
  });

  suspendVendor = catchAsync(async (req: AuthRequest, res: Response) => {
    const { vendorProfileId } = req.params as { vendorProfileId: string };
    const profile = await adminService.suspendVendor(vendorProfileId);
    ApiResponse.success(res, profile, 'Vendor suspended successfully');
  });

  setVendorCommission = catchAsync(async (req: AuthRequest, res: Response) => {
    const { vendorProfileId } = req.params as { vendorProfileId: string };
    const { rate } = req.body as UpdateVendorCommissionInput;
    const profile = await adminService.setVendorCommission(vendorProfileId, rate);
    ApiResponse.success(res, profile, 'Vendor commission rate updated');
  });

  // ---- Products ----

  listProducts = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await adminService.listProducts(
      req.query as unknown as ListProductsQueryInput
    );
    ApiResponse.success(res, result, 'Products retrieved');
  });

  activateProduct = catchAsync(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params as { productId: string };
    const product = await adminService.activateProduct(productId);
    ApiResponse.success(res, product, 'Product activated');
  });

  deactivateProduct = catchAsync(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params as { productId: string };
    const product = await adminService.deactivateProduct(productId);
    ApiResponse.success(res, product, 'Product deactivated');
  });

  deleteProduct = catchAsync(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params as { productId: string };
    await adminService.deleteProduct(productId);
    ApiResponse.noContent(res);
  });

  // ---- Orders ----

  listAllOrders = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await adminService.listAllOrders(
      req.query as unknown as ListOrdersQueryInput
    );
    ApiResponse.success(res, result, 'Orders retrieved');
  });

  getOrderById = catchAsync(async (req: AuthRequest, res: Response) => {
    const { orderId } = req.params as { orderId: string };
    const order = await adminService.getOrderById(orderId);
    ApiResponse.success(res, order, 'Order retrieved');
  });

  // ---- Revenue ----

  getPlatformRevenue = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await adminService.getPlatformRevenue(
      req.query as unknown as RevenueQueryInput
    );
    ApiResponse.success(res, result, 'Platform revenue retrieved');
  });

  // ---- Commission ----

  getDefaultCommission = catchAsync(async (_req: AuthRequest, res: Response) => {
    const result = await adminService.getDefaultCommission();
    ApiResponse.success(res, result, 'Default commission rate retrieved');
  });

  setDefaultCommission = catchAsync(async (req: AuthRequest, res: Response) => {
    const { rate } = req.body as UpdateCommissionInput;
    const result = await adminService.setDefaultCommission(rate);
    ApiResponse.success(res, result, 'Default commission rate updated');
  });
}
