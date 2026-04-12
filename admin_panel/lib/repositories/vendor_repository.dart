import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/vendors/models/vendor_model.dart';

class VendorRepository {
  final Dio _dio;

  VendorRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<({List<VendorModel> items, int total, int page, int totalPages})>
      listVendors({
    int page = 1,
    int limit = 15,
    String? status,
    String? search,
  }) async {
    try {
      final response = await _dio.get(
        '/admin/vendors',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null) 'status': status,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load vendors');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List || data['meta'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load vendors');
      }
      final items = (data['items'] as List<dynamic>)
          .map((e) => VendorModel.fromJson(e as Map<String, dynamic>))
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

  Future<void> approveVendor(String vendorId) async {
    try {
      await _dio.patch('/admin/vendors/$vendorId/approve');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> rejectVendor(String vendorId) async {
    try {
      await _dio.patch('/admin/vendors/$vendorId/reject');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> suspendVendor(String vendorId) async {
    try {
      await _dio.patch('/admin/vendors/$vendorId/suspend');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
