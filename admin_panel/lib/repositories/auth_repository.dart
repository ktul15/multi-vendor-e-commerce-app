import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../core/network/token_storage.dart';

class AuthRepository {
  final Dio _dio;
  final TokenStorage _tokenStorage;

  AuthRepository({required Dio dio, required TokenStorage tokenStorage})
      : _dio = dio,
        _tokenStorage = tokenStorage;

  /// Restore the stored access token to the Dio header.
  /// Called on app start before any authenticated request.
  Future<void> restoreToken() async {
    final accessToken = await _tokenStorage.getAccessToken();
    if (accessToken != null) ApiClient.setAuthToken(accessToken);
  }

  /// Login with email and password.
  /// Verifies ADMIN role before saving tokens — non-admin credentials are
  /// rejected with a 403 ApiException and no tokens are ever persisted.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      final body = response.data as Map<String, dynamic>;
      final data = body['data'] as Map<String, dynamic>;
      final user = data['user'] as Map<String, dynamic>;

      if (user['role'] != 'ADMIN') {
        throw const ApiException(
          'Access denied. Admin credentials required.',
          statusCode: 403,
        );
      }

      final tokens = data['tokens'] as Map<String, dynamic>;
      await _tokenStorage.saveTokens(
        accessToken: tokens['accessToken'] as String,
        refreshToken: tokens['refreshToken'] as String,
      );
      ApiClient.setAuthToken(tokens['accessToken'] as String);
      return user;
    } on ApiException {
      rethrow;
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  /// Fetch the current admin's profile.
  Future<Map<String, dynamic>> getProfile() async {
    try {
      final response = await _dio.get('/auth/profile');
      final body = response.data as Map<String, dynamic>;
      return body['data'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  /// Logout — notifies server, then clears local tokens and Dio header.
  Future<void> logout() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {
      // Clear tokens even if the server request fails
    } finally {
      await _tokenStorage.clearTokens();
      ApiClient.clearAuthToken();
    }
  }

  /// Returns true if access and refresh tokens are stored locally.
  Future<bool> hasStoredTokens() => _tokenStorage.hasTokens();
}
