import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../features/admin_dashboard/models/admin_order_model.dart';
import '../features/admin_dashboard/models/admin_stats_model.dart';
import '../features/admin_dashboard/models/revenue_model.dart';

class AdminDashboardRepository {
  final HttpClient _client;

  AdminDashboardRepository({required HttpClient client}) : _client = client;

  Future<AdminStatsModel> getStats() async {
    final body = await _client.get('/admin/dashboard');
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to load dashboard stats');
    }
    return AdminStatsModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<RevenueModel> getRevenue({String period = 'day'}) async {
    final body = await _client.get(
      '/admin/revenue',
      queryParameters: {'period': period},
    );
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to load revenue data');
    }
    return RevenueModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<List<AdminOrderModel>> getRecentOrders() async {
    final body = await _client.get(
      '/admin/orders',
      queryParameters: {'page': '1', 'limit': '5'},
    );
    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List) {
      throw const ApiException('Failed to load recent orders');
    }
    final data = body['data'] as Map<String, dynamic>;
    return (data['items'] as List<dynamic>)
        .map((e) => AdminOrderModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
