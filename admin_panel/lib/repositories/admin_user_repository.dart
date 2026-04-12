import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/users/models/admin_user_model.dart';
import '../features/users/models/user_list_meta_model.dart';

class AdminUserRepository {
  final Dio _dio;

  AdminUserRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<({List<AdminUserModel> items, UserListMetaModel meta})> listUsers({
    int page = 1,
    int limit = 15,
    String? role,
    String? search,
  }) async {
    try {
      final response = await _dio.get(
        '/admin/users',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (role != null) 'role': role,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load users');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List || data['meta'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load users');
      }
      final items = (data['items'] as List<dynamic>)
          .map((e) => AdminUserModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = UserListMetaModel.fromJson(
        data['meta'] as Map<String, dynamic>,
      );
      return (items: items, meta: meta);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> banUser(String userId) async {
    try {
      await _dio.patch('/admin/users/$userId/ban');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> unbanUser(String userId) async {
    try {
      await _dio.patch('/admin/users/$userId/unban');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
