import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { sendPushToUser } from '../../utils/fcm';
import { NotificationType } from '../../generated/prisma/client';
import {
  GetNotificationsQueryInput,
} from './notification.validation';

export class NotificationService {
  /**
   * Save or update a user's FCM token.
   * Handles the unique constraint by clearing the token from any other user first.
   */
  async saveFcmToken(userId: string, token: string): Promise<void> {
    // Transaction prevents unique constraint violations when two users
    // try to claim the same token concurrently.
    await prisma.$transaction(async (tx) => {
      // Clear this token from any other user who may have it
      // (e.g. user logged out without clearing, then another user logs in on same device)
      await tx.user.updateMany({
        where: { fcmToken: token, NOT: { id: userId } },
        data: { fcmToken: null },
      });

      await tx.user.update({
        where: { id: userId },
        data: { fcmToken: token },
      });
    });
  }

  /**
   * Remove the user's FCM token (e.g. on logout).
   */
  async removeFcmToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  /**
   * List notifications for a user with pagination and optional read/unread filter.
   */
  async getNotifications(userId: string, query: GetNotificationsQueryInput) {
    const { page, limit, isRead } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(isRead !== undefined && { isRead }),
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      items: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Get the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read. Verifies ownership.
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    if (notification.userId !== userId) {
      throw ApiError.forbidden('You cannot modify this notification');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Create a notification in the DB and send a push via FCM.
   * Called from other services (e.g. order status change).
   */
  async createAndSend(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ?? undefined,
      },
    });

    await sendPushToUser(userId, title, body, data);
  }
}
