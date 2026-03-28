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

router.put(
  '/fcm-token',
  validate(saveFcmTokenSchema),
  notificationController.saveFcmToken
);
router.delete('/fcm-token', notificationController.removeFcmToken);

router.get(
  '/',
  validateQuery(getNotificationsQuerySchema),
  notificationController.list
);
router.get('/unread-count', notificationController.unreadCount);

router.put('/read-all', notificationController.markAllRead);
router.put(
  '/:id/read',
  validateParams(notificationParamSchema),
  notificationController.markRead
);

export default router;
