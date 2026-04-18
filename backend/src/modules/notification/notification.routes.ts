import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate, validateParams, validateQuery } from '../../middleware/validate';
import {
  saveFcmTokenSchema,
  getNotificationsQuerySchema,
  notificationParamSchema,
} from './notification.validation';
import { NotificationController } from './notification.controller';

const router = Router();
const notificationController = new NotificationController();

// All notification routes require authentication (any role)
router.use(authenticate);

/**
 * @openapi
 * /notifications/fcm-token:
 *   put:
 *     tags: [Notifications]
 *     summary: Register an FCM push token
 *     description: Saves or updates the Firebase Cloud Messaging token for the current device. Call this after login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "fMQbB9Q9Q7E..."
 *     responses:
 *       200:
 *         description: FCM token saved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/fcm-token',
  validate(saveFcmTokenSchema),
  notificationController.saveFcmToken
);

/**
 * @openapi
 * /notifications/fcm-token:
 *   delete:
 *     tags: [Notifications]
 *     summary: Remove the FCM push token
 *     description: Deregisters the push token for the current device. Call this on logout.
 *     responses:
 *       200:
 *         description: FCM token removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/fcm-token', notificationController.removeFcmToken);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: isRead
 *         schema: { type: boolean }
 *         description: Filter by read/unread status
 *     responses:
 *       200:
 *         description: Paginated notification list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  validateQuery(getNotificationsQuerySchema),
  notificationController.list
);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get count of unread notifications
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Unread count fetched
 *               data: { count: 5 }
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', notificationController.unreadCount);

/**
 * @openapi
 * /notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.put('/read-all', notificationController.markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 */
router.put(
  '/:id/read',
  validateParams(notificationParamSchema),
  notificationController.markRead
);

export default router;
