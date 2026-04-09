import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/products/models/admin_product_model.dart';

class ProductModerationRepository {
  final Dio _dio;

  ProductModerationRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<({List<AdminProductModel> items, int total, int page, int totalPages})>
      listProducts({
    int page = 1,
    int limit = 15,
    bool? isActive,
    String? search,
  }) async {
    try {
      final response = await _dio.get(
        '/admin/products',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (isActive != null) 'isActive': isActive,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load products');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List || data['meta'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load products');
      }
      final items = (data['items'] as List<dynamic>)
          .map((e) => AdminProductModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = data['meta'] as Map<String, dynamic>;
      return (
        items: items,
        total: meta['total'] as int,
        page: meta['page'] as int,
        totalPages: meta['totalPages'] as int,
      );
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> activateProduct(String productId) async {
    try {
      await _dio.patch('/admin/products/$productId/activate');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> deactivateProduct(String productId) async {
    try {
      await _dio.patch('/admin/products/$productId/deactivate');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await _dio.delete('/admin/products/$productId');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
