import { Response } from 'express';
import { OrderService } from './order.service';
import {
  CreateOrderInput,
  GetOrdersQueryInput,
  CancelOrderInput,
  UpdateVendorOrderStatusInput,
} from './order.validation';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';

const orderService = new OrderService();

export class OrderController {
  create = catchAsync(async (req: AuthRequest, res: Response) => {
    const order = await orderService.createOrder(
      req.user!.userId,
      req.body as CreateOrderInput
    );
    ApiResponse.created(res, order, 'Order placed successfully');
  });

  list = catchAsync(async (req: AuthRequest, res: Response) => {
    const orders = await orderService.getOrders(
      req.user!.userId,
      req.query as unknown as GetOrdersQueryInput
    );
    ApiResponse.success(res, orders, 'Orders retrieved successfully');
  });

  getById = catchAsync(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const order = await orderService.getOrderById(req.user!.userId, id);
    ApiResponse.success(res, order, 'Order retrieved successfully');
  });

  cancel = catchAsync(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const order = await orderService.cancelOrder(
      req.user!.userId,
      id,
      req.body as CancelOrderInput
    );
    ApiResponse.success(res, order, 'Order cancelled successfully');
  });

  updateVendorOrderStatus = catchAsync(
    async (req: AuthRequest, res: Response) => {
      const id = req.params.id as string;
      const vendorOrderId = req.params.vendorOrderId as string;
      const vendorOrder = await orderService.updateVendorOrderStatus(
        req.user!.userId,
        id,
        vendorOrderId,
        req.body as UpdateVendorOrderStatusInput
      );
      ApiResponse.success(
        res,
        vendorOrder,
        'Vendor order status updated successfully'
      );
    }
  );
}
