import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/token_storage.dart';

/// Auth repository — handles API calls for authentication.
class AuthRepository {
  final Dio _dio;
  final TokenStorage _tokenStorage;

  AuthRepository({Dio? dio, TokenStorage? tokenStorage})
    : _dio = dio ?? ApiClient.instance,
      _tokenStorage = tokenStorage ?? TokenStorage();

  /// Register a new user.
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      '/auth/register',
      data: {'name': name, 'email': email, 'password': password},
    );

    final data = response.data['data'];

    await _tokenStorage.saveTokens(
      accessToken: data['tokens']['accessToken'],
      refreshToken: data['tokens']['refreshToken'],
    );

    return data['user'];
  }

  /// Login with email and password.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );

    final data = response.data['data'];

    await _tokenStorage.saveTokens(
      accessToken: data['tokens']['accessToken'],
      refreshToken: data['tokens']['refreshToken'],
    );

    return data['user'];
  }

  /// Get current user profile.
  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/auth/profile');
    return response.data['data'];
  }

  /// Logout — clear tokens and notify server.
  Future<void> logout() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {
      // Ignore logout API errors — we clear tokens regardless
    } finally {
      await _tokenStorage.clearTokens();
      ApiClient.reset();
    }
  }

  /// Check if user has stored tokens for auto-login.
  Future<bool> hasStoredTokens() => _tokenStorage.hasTokens();
}
