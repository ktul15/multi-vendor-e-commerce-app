import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../features/admin_user_management/models/admin_user_model.dart';
import '../features/admin_user_management/models/user_list_meta_model.dart';

class AdminUserRepository {
  final HttpClient _client;

  AdminUserRepository({required HttpClient client}) : _client = client;

  Future<({List<AdminUserModel> items, UserListMetaModel meta})> listUsers({
    int page = 1,
    int limit = 15,
    String? role,
    String? search,
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page.toString(),
      'limit': limit.toString(),
      if (role != null) 'role': role,
      if (search != null && search.isNotEmpty) 'search': search,
    };

    final body = await _client.get(
      '/admin/users',
      queryParameters: queryParameters,
    );

    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to load users');
    }

    final data = body['data'] as Map<String, dynamic>;

    if (data['items'] is! List || data['meta'] is! Map) {
      throw const ApiException('Failed to load users');
    }

    final items = (data['items'] as List<dynamic>)
        .map((e) => AdminUserModel.fromJson(e as Map<String, dynamic>))
        .toList();

    final meta = UserListMetaModel.fromJson(
      data['meta'] as Map<String, dynamic>,
    );

    return (items: items, meta: meta);
  }

  Future<void> banUser(String userId) async {
    final body = await _client.patch('/admin/users/$userId/ban');
    if (body == null) throw const ApiException('Failed to ban user');
  }

  Future<void> unbanUser(String userId) async {
    final body = await _client.patch('/admin/users/$userId/unban');
    if (body == null) throw const ApiException('Failed to unban user');
  }
}
