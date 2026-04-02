import { z } from 'zod/v4';
import { coerceNumber } from '../../utils/zodHelpers';

export const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  promoCode: z.string().trim().min(1).optional(),
  notes: z.string().max(500).optional(),
});

export const getOrdersQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(10)
  ),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
});

export const orderParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const vendorOrderParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
  vendorOrderId: z.string().uuid('Invalid vendor order ID'),
});

export const updateVendorOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
});

export const getVendorOrdersQuerySchema = getOrdersQuerySchema;

export const vendorOrderIdParamSchema = z.object({
  id: z.string().uuid('Invalid vendor order ID'),
});

export const updateVendorOrderStatusWithTrackingSchema =
  updateVendorOrderStatusSchema
    .extend({
      trackingNumber: z.string().trim().min(1).max(100).optional(),
      trackingCarrier: z.string().trim().min(1).max(100).optional(),
    })
    .refine(
      (data) =>
        data.status !== 'SHIPPED' || (data.trackingNumber && data.trackingCarrier),
      {
        message: 'Tracking number and carrier are required when marking as shipped',
        path: ['trackingNumber'],
      }
    );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type GetOrdersQueryInput = z.infer<typeof getOrdersQuerySchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type UpdateVendorOrderStatusInput = z.infer<
  typeof updateVendorOrderStatusSchema
>;
export type GetVendorOrdersQueryInput = z.infer<
  typeof getVendorOrdersQuerySchema
>;
export type UpdateVendorOrderStatusWithTrackingInput = z.infer<
  typeof updateVendorOrderStatusWithTrackingSchema
>;
