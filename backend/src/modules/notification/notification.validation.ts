import { z } from 'zod/v4';
import { coerceNumber, coerceBoolean } from '../../utils/zodHelpers';

export const saveFcmTokenSchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
});

export const getNotificationsQuerySchema = z.object({
  page: z.preprocess(coerceNumber, z.number().min(1).optional().default(1)),
  limit: z.preprocess(
    coerceNumber,
    z.number().min(1).max(100).optional().default(20)
  ),
  isRead: z.preprocess(coerceBoolean, z.boolean().optional()),
});

export const notificationParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

export type SaveFcmTokenInput = z.infer<typeof saveFcmTokenSchema>;
export type GetNotificationsQueryInput = z.infer<
  typeof getNotificationsQuerySchema
>;
