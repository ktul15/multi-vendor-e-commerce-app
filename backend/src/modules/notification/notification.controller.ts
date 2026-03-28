import { Response } from 'express';
import { NotificationService } from './notification.service';
import {
  SaveFcmTokenInput,
  GetNotificationsQueryInput,
} from './notification.validation';
import { ApiResponse } from '../../utils/apiResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthRequest } from '../../types';

const notificationService = new NotificationService();

export class NotificationController {
  saveFcmToken = catchAsync(async (req: AuthRequest, res: Response) => {
    const { token } = req.body as SaveFcmTokenInput;
    await notificationService.saveFcmToken(req.user!.userId, token);
    ApiResponse.success(res, null, 'FCM token saved');
  });

  removeFcmToken = catchAsync(async (req: AuthRequest, res: Response) => {
    await notificationService.removeFcmToken(req.user!.userId);
    ApiResponse.noContent(res);
  });

  list = catchAsync(async (req: AuthRequest, res: Response) => {
    const notifications = await notificationService.getNotifications(
      req.user!.userId,
      req.query as unknown as GetNotificationsQueryInput
    );
    ApiResponse.success(
      res,
      notifications,
      'Notifications retrieved successfully'
    );
  });

  unreadCount = catchAsync(async (req: AuthRequest, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    ApiResponse.success(res, { count }, 'Unread count retrieved');
  });

  markRead = catchAsync(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    await notificationService.markAsRead(req.user!.userId, id);
    ApiResponse.success(res, null, 'Notification marked as read');
  });

  markAllRead = catchAsync(async (req: AuthRequest, res: Response) => {
    await notificationService.markAllAsRead(req.user!.userId);
    ApiResponse.success(res, null, 'All notifications marked as read');
  });
}
