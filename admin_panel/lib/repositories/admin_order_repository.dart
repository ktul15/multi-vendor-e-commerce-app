import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/dashboard/models/admin_order_model.dart';
import '../features/orders/models/admin_order_detail_model.dart';
import '../features/users/models/user_list_meta_model.dart';

class AdminOrderRepository {
  final Dio _dio;

  AdminOrderRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<({List<AdminOrderModel> items, UserListMetaModel meta})> listOrders({
    int page = 1,
    int limit = 20,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    String? userId,
    String? vendorId,
  }) async {
    try {
      final response = await _dio.get(
        '/admin/orders',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null) 'status': status,
          if (startDate != null) 'startDate': startDate.toUtc().toIso8601String(),
          if (endDate != null) 'endDate': endDate.toUtc().toIso8601String(),
          if (userId != null) 'userId': userId,
          if (vendorId != null) 'vendorId': vendorId,
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load orders');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List) {
        throw const ApiException('Failed to load orders');
      }
      final items = (data['items'] as List<dynamic>)
          .map((e) => AdminOrderModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = UserListMetaModel.fromJson(
        data['meta'] as Map<String, dynamic>,
      );
      return (items: items, meta: meta);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<AdminOrderDetailModel> getOrderById(String id) async {
    try {
      final response = await _dio.get('/admin/orders/$id');
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load order details');
      }
      return AdminOrderDetailModel.fromJson(
        body['data'] as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
