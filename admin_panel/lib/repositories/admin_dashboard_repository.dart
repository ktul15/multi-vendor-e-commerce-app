import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/dashboard/models/admin_order_model.dart';
import '../features/dashboard/models/admin_stats_model.dart';
import '../features/dashboard/models/revenue_model.dart';

class AdminDashboardRepository {
  final Dio _dio;

  AdminDashboardRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<AdminStatsModel> getStats() async {
    try {
      final response = await _dio.get('/admin/dashboard');
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load dashboard stats');
      }
      return AdminStatsModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<RevenueModel> getRevenue({String period = 'day'}) async {
    try {
      final response = await _dio.get(
        '/admin/revenue',
        queryParameters: {'period': period},
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load revenue data');
      }
      return RevenueModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<List<AdminOrderModel>> getRecentOrders() async {
    try {
      final response = await _dio.get(
        '/admin/orders',
        queryParameters: {'page': 1, 'limit': 5},
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load recent orders');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List) {
        throw const ApiException('Failed to load recent orders');
      }
      return (data['items'] as List<dynamic>)
          .map((e) => AdminOrderModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
