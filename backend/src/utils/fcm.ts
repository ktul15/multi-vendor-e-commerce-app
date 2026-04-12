import admin from 'firebase-admin';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Initialize the Firebase Admin SDK.
 * Call once at server startup. Requires GOOGLE_APPLICATION_CREDENTIALS env var
 * pointing to a service-account JSON file.
 */
export function initializeFirebase(): void {
  if (!env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger.warn(
      'GOOGLE_APPLICATION_CREDENTIALS not set — FCM push notifications disabled'
    );
    return;
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  logger.info('Firebase Admin SDK initialized');
}

/**
 * Send a push notification to a single FCM registration token.
 * Returns `true` if sent, `false` if the token was stale and removed.
 */
async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  // If Firebase wasn't initialised (no credentials), skip silently.
  if (admin.apps.length === 0) return false;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: data ?? {},
    });
    return true;
  } catch (error: unknown) {
    const code =
      error instanceof Error && 'code' in error
        ? (error as { code: string }).code
        : '';

    // Token is no longer valid — clear it from DB so we stop retrying.
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      await prisma.user.updateMany({
        where: { fcmToken },
        data: { fcmToken: null },
      });
      logger.warn(`Stale FCM token removed: ${fcmToken.slice(0, 12)}…`);
      return false;
    }

    logger.error('FCM send error:', error);
    return false;
  }
}

/**
 * Look up a user's FCM token and send a push notification.
 * No-ops silently when the user has no token registered.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) return;

  await sendPushNotification(user.fcmToken, title, body, data);
}
