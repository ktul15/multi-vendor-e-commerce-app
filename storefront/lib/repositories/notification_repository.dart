import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/notification_model.dart';

class NotificationRepository {
  final HttpClient _client;

  NotificationRepository({required HttpClient client}) : _client = client;

  Future<void> saveFcmToken(String token) async {
    await _client.put('/notifications/fcm-token', data: {'token': token});
  }

  Future<void> removeFcmToken() async {
    await _client.delete('/notifications/fcm-token');
  }

  Future<NotificationsPageData> getNotifications({
    int page = 1,
    int limit = 20,
  }) async {
    final body = await _client.get(
      '/notifications',
      queryParameters: {'page': '$page', 'limit': '$limit'},
    );

    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const ApiException('Failed to load notifications');
    }

    final data = body['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>;

    return NotificationsPageData(
      items: (data['items'] as List<dynamic>)
          .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }

  Future<int> getUnreadCount() async {
    final body = await _client.get('/notifications/unread-count');
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to load unread count');
    }
    return (body['data'] as Map)['count'] as int;
  }

  Future<void> markAsRead(String id) async {
    await _client.put('/notifications/${Uri.encodeComponent(id)}/read');
  }

  Future<void> markAllAsRead() async {
    await _client.put('/notifications/read-all');
  }
}
