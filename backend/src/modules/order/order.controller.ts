import { Response } from 'express';
import { OrderService } from './order.service';
import { CreateOrderInput } from './order.validation';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';

const orderService = new OrderService();

export class OrderController {
    create = catchAsync(async (req: AuthRequest, res: Response) => {
        const order = await orderService.createOrder(req.user!.userId, req.body as CreateOrderInput);
        ApiResponse.created(res, order, 'Order placed successfully');
    });
}
