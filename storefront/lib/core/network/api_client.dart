import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/app_env.dart';
import 'token_storage.dart';

/// Centralized API client with interceptors.
///
/// Interceptors:
/// 1. Auth — auto-attaches JWT access token to requests
/// 2. Token refresh — auto-refreshes on 401 and retries the request
/// 3. Error — transforms DioExceptions into structured errors
/// 4. Logging — logs requests/responses in debug mode
class ApiClient {
  ApiClient._();

  static Dio? _dio;
  static TokenStorage _tokenStorage = TokenStorage();

  /// Get or create the Dio singleton.
  static Dio get instance {
    _dio ??= _createDio();
    return _dio!;
  }

  /// Set the token storage instance (call before accessing `instance`).
  /// Useful for injecting via GetIt.
  static set tokenStorage(TokenStorage storage) {
    _tokenStorage = storage;
  }

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppEnv.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // 1. Auth interceptor — attaches Bearer token
    dio.interceptors.add(_authInterceptor());

    // 2. Token refresh interceptor — handles 401
    dio.interceptors.add(_tokenRefreshInterceptor(dio));

    // 3. Error interceptor — standardizes error responses
    dio.interceptors.add(_errorInterceptor());

    // 4. Logging interceptor — debug mode only
    if (kDebugMode) {
      dio.interceptors.add(_loggingInterceptor());
    }

    return dio;
  }

  /// Auth interceptor: reads token from secure storage and attaches to headers.
  static InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _tokenStorage.getAccessToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    );
  }

  /// Token refresh interceptor: on 401, attempts to refresh the access token
  /// using the stored refresh token, then retries the original request.
  static InterceptorsWrapper _tokenRefreshInterceptor(Dio dio) {
    return InterceptorsWrapper(
      onError: (error, handler) async {
        if (error.response?.statusCode != 401) {
          return handler.next(error);
        }

        // Don't try to refresh if this IS the refresh request
        if (error.requestOptions.path.contains('/auth/refresh')) {
          return handler.next(error);
        }

        // Don't try to refresh for login/register requests
        if (error.requestOptions.path.contains('/auth/login') ||
            error.requestOptions.path.contains('/auth/register')) {
          return handler.next(error);
        }

        try {
          final refreshToken = await _tokenStorage.getRefreshToken();
          if (refreshToken == null) {
            return handler.next(error);
          }

          // Create a fresh Dio instance to avoid interceptor loops
          final refreshDio = Dio(
            BaseOptions(
              baseUrl: AppEnv.apiBaseUrl,
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            ),
          );

          final response = await refreshDio.post(
            '/auth/refresh',
            data: {'refreshToken': refreshToken},
          );

          if (response.statusCode == 200 && response.data['success'] == true) {
            final newAccessToken = response.data['data']['accessToken'];
            final newRefreshToken = response.data['data']['refreshToken'];

            await _tokenStorage.saveTokens(
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            );

            // Retry the original request with the new token
            final retryOptions = error.requestOptions;
            retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';

            final retryResponse = await dio.fetch(retryOptions);
            return handler.resolve(retryResponse);
          }
        } catch (_) {
          // Refresh failed — clear tokens (user needs to re-login)
          await _tokenStorage.clearTokens();
        }

        handler.next(error);
      },
    );
  }

  /// Error interceptor: extracts API error messages from response body.
  static InterceptorsWrapper _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        // Extract the server error message if available
        if (error.response?.data is Map<String, dynamic>) {
          final data = error.response!.data as Map<String, dynamic>;
          final message = data['message'] as String? ?? 'Something went wrong';
          error = error.copyWith(message: message);
        }
        handler.next(error);
      },
    );
  }

  /// Logging interceptor: logs requests and responses in debug builds.
  static LogInterceptor _loggingInterceptor() {
    return LogInterceptor(
      requestBody: true,
      responseBody: true,
      requestHeader: false,
      responseHeader: false,
      error: true,
      logPrint: (msg) => debugPrint('🌐 $msg'),
    );
  }

  /// Clear the singleton (useful for testing or after logout).
  static void reset() {
    _dio?.close();
    _dio = null;
  }
}
