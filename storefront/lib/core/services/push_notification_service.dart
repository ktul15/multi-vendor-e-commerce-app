import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../repositories/notification_repository.dart';

/// Handles FCM token management, foreground/background message routing,
/// and deep-link resolution for push notifications.
class PushNotificationService {
  final NotificationRepository _notificationRepository;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  // Recreated on each initialize() so subscribers get a fresh stream after logout/login.
  StreamController<RemoteMessage> _foregroundController =
      StreamController<RemoteMessage>.broadcast();

  /// Stream of messages received while the app is in the foreground.
  Stream<RemoteMessage> get foregroundMessages => _foregroundController.stream;

  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _foregroundSub;

  PushNotificationService({
    required NotificationRepository notificationRepository,
  }) : _notificationRepository = notificationRepository;

  /// Request permissions, get the FCM token, save it to the backend,
  /// and set up message listeners. Call after successful login.
  Future<void> initialize() async {
    // Close previous controller and create a fresh one for re-login scenarios
    if (_foregroundController.isClosed) {
      _foregroundController = StreamController<RemoteMessage>.broadcast();
    }

    // Request notification permissions (iOS prompts user; Android auto-grants)
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get and save the current FCM token
    final token = await _messaging.getToken();
    if (token != null) {
      try {
        await _notificationRepository.saveFcmToken(token);
      } catch (_) {
        // Non-critical — token will be retried on next app launch
      }
    }

    // Listen for token refreshes and re-save
    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = _messaging.onTokenRefresh.listen((newToken) async {
      try {
        await _notificationRepository.saveFcmToken(newToken);
      } catch (_) {
        // Silently fail — will retry on next refresh
      }
    });

    // Forward foreground messages to the stream
    _foregroundSub?.cancel();
    _foregroundSub = FirebaseMessaging.onMessage.listen((message) {
      _foregroundController.add(message);
    });
  }

  /// Clean up listeners. Call on logout.
  void dispose() {
    _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    _foregroundSub?.cancel();
    _foregroundSub = null;
    _foregroundController.close();
  }
}

/// Top-level function for background message handling.
/// Must be a top-level function (not a method) — runs in a separate isolate.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // The system notification tray handles display automatically.
  // No custom logic needed here for now.
}
