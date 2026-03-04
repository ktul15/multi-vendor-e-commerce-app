import 'package:dio/dio.dart';
import '../config/app_env.dart';

/// Singleton API client using Dio.
/// Pre-configured with base URL, timeouts, and JSON headers.
class ApiClient {
  ApiClient._();

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: AppEnv.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  static Dio get instance => _dio;

  /// Set the auth token for subsequent requests.
  static void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  /// Clear the auth token (on logout).
  static void clearAuthToken() {
    _dio.options.headers.remove('Authorization');
  }
}
