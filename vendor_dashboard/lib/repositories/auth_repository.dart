import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/token_storage.dart';

/// Auth repository for Vendor Dashboard.
class AuthRepository {
  final Dio _dio;
  final TokenStorage _tokenStorage;

  AuthRepository({Dio? dio, required TokenStorage tokenStorage})
    : _dio = dio ?? ApiClient.instance,
      _tokenStorage = tokenStorage;

  /// Login with email and password.
  /// Enforces that only VENDOR or ADMIN can access the dashboard.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );

    final data = response.data['data'];
    final user = data['user'];

    // Role-based access control for Vendor Dashboard
    if (user['role'] == 'CUSTOMER') {
      throw DioException(
        requestOptions: response.requestOptions,
        response: Response(
          requestOptions: response.requestOptions,
          statusCode: 403,
          data: {'message': 'Unauthorized access. Vendor account required.'},
        ),
      );
    }

    await _tokenStorage.saveTokens(
      accessToken: data['tokens']['accessToken'],
      refreshToken: data['tokens']['refreshToken'],
    );

    return user;
  }

  /// Get current user profile and verify role.
  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/auth/profile');
    final user = response.data['data'];

    if (user['role'] == 'CUSTOMER') {
      throw DioException(
        requestOptions: response.requestOptions,
        response: Response(
          requestOptions: response.requestOptions,
          statusCode: 403,
          data: {'message': 'Unauthorized access. Vendor account required.'},
        ),
      );
    }

    return user;
  }

  /// Logout — clear tokens and notify server.
  Future<void> logout() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {
    } finally {
      await _tokenStorage.clearTokens();
      ApiClient.reset();
    }
  }

  /// Check if user has stored tokens.
  Future<bool> hasStoredTokens() => _tokenStorage.hasTokens();
}
