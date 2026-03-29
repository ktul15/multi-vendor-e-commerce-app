import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/services/push_notification_service.dart';
import '../../../repositories/notification_repository.dart';
import 'notification_state.dart';

class NotificationCubit extends Cubit<NotificationState> {
  final NotificationRepository _repository;
  final PushNotificationService _pushService;
  StreamSubscription<dynamic>? _foregroundSub;

  NotificationCubit({
    required NotificationRepository repository,
    required PushNotificationService pushService,
  })  : _repository = repository,
        _pushService = pushService,
        super(const NotificationInitial());

  /// Start listening for foreground push messages and load initial unread count.
  Future<void> init() async {
    _foregroundSub?.cancel();
    _foregroundSub = _pushService.foregroundMessages.listen((_) {
      _incrementUnreadCount();
    });

    // Load the initial unread count from the API
    try {
      final count = await _repository.getUnreadCount();
      emit(NotificationLoaded(notifications: const [], unreadCount: count));
    } catch (_) {
      emit(const NotificationLoaded(notifications: [], unreadCount: 0));
    }
  }

  /// Load the first page of notifications.
  Future<void> loadNotifications() async {
    final current = state;
    if (current is NotificationLoaded && current.isLoading) return;

    if (current is NotificationLoaded) {
      emit(current.copyWith(isLoading: true, clearError: true));
    } else {
      emit(const NotificationLoaded(
        notifications: [],
        unreadCount: 0,
        isLoading: true,
      ));
    }

    try {
      final results = await Future.wait([
        _repository.getNotifications(page: 1),
        _repository.getUnreadCount(),
      ]);
      final result = results[0] as NotificationsPageData;
      final unread = results[1] as int;
      emit(NotificationLoaded(
        notifications: result.items,
        unreadCount: unread,
        page: result.page,
        totalPages: result.totalPages,
      ));
    } catch (e) {
      final s = state;
      if (s is NotificationLoaded) {
        emit(s.copyWith(isLoading: false, error: e.toString()));
      }
    }
  }

  /// Load the next page of notifications.
  Future<void> loadMore() async {
    final current = state;
    if (current is! NotificationLoaded) return;
    if (current.isLoadingMore || !current.hasMore) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final result = await _repository.getNotifications(page: nextPage);
      emit(current.copyWith(
        notifications: [...current.notifications, ...result.items],
        page: result.page,
        totalPages: result.totalPages,
        isLoadingMore: false,
      ));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false, error: e.toString()));
    }
  }

  /// Pull-to-refresh — reload from page 1.
  Future<void> refresh() async {
    await loadNotifications();
  }

  /// Mark a single notification as read (optimistic update).
  Future<void> markAsRead(String id) async {
    final current = state;
    if (current is! NotificationLoaded) return;

    // Optimistic update
    final updated = current.notifications
        .map((n) => n.id == id ? n.copyWith(isRead: true) : n)
        .toList();
    final wasUnread = current.notifications.any((n) => n.id == id && !n.isRead);
    final newCount =
        wasUnread ? (current.unreadCount - 1).clamp(0, 999) : current.unreadCount;

    emit(current.copyWith(notifications: updated, unreadCount: newCount));

    try {
      await _repository.markAsRead(id);
    } catch (_) {
      // Revert on failure
      emit(current);
    }
  }

  /// Mark all notifications as read (optimistic update).
  Future<void> markAllAsRead() async {
    final current = state;
    if (current is! NotificationLoaded) return;

    final updated =
        current.notifications.map((n) => n.copyWith(isRead: true)).toList();
    emit(current.copyWith(notifications: updated, unreadCount: 0));

    try {
      await _repository.markAllAsRead();
    } catch (_) {
      emit(current);
    }
  }

  void _incrementUnreadCount() {
    final current = state;
    if (current is NotificationLoaded) {
      emit(current.copyWith(unreadCount: current.unreadCount + 1));
    }
  }

  /// Reset state on logout.
  void reset() {
    _foregroundSub?.cancel();
    _foregroundSub = null;
    emit(const NotificationInitial());
  }

  @override
  Future<void> close() {
    _foregroundSub?.cancel();
    return super.close();
  }
}
