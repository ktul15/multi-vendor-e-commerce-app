import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/app_env.dart';
import 'token_storage.dart';

/// Centralized API client with interceptors for Vendor Dashboard.
class ApiClient {
  ApiClient._();

  static Dio? _dio;
  static late TokenStorage _tokenStorage;

  /// Get or create the Dio singleton.
  static Dio get instance {
    _dio ??= _createDio();
    return _dio!;
  }

  /// Set the token storage instance (call before accessing `instance`).
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

    dio.interceptors.add(_authInterceptor());
    dio.interceptors.add(_tokenRefreshInterceptor(dio));
    dio.interceptors.add(_errorInterceptor());

    if (kDebugMode) {
      dio.interceptors.add(_loggingInterceptor());
    }

    return dio;
  }

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

  static InterceptorsWrapper _tokenRefreshInterceptor(Dio dio) {
    return InterceptorsWrapper(
      onError: (error, handler) async {
        if (error.response?.statusCode != 401) {
          return handler.next(error);
        }

        if (error.requestOptions.path.contains('/auth/refresh') ||
            error.requestOptions.path.contains('/auth/login') ||
            error.requestOptions.path.contains('/auth/register')) {
          return handler.next(error);
        }

        try {
          final refreshToken = await _tokenStorage.getRefreshToken();
          if (refreshToken == null) {
            return handler.next(error);
          }

          final refreshDio = Dio(
            BaseOptions(
              baseUrl: AppEnv.apiBaseUrl,
              headers: {'Content-Type': 'application/json'},
            ),
          );

          final response = await refreshDio.post(
            '/auth/refresh',
            data: {'refreshToken': refreshToken},
          );

          if (response.statusCode == 200 && response.data['success'] == true) {
            final newAccess = response.data['data']['accessToken'];
            final newRefresh = response.data['data']['refreshToken'];

            await _tokenStorage.saveTokens(
              accessToken: newAccess,
              refreshToken: newRefresh,
            );

            final retryOptions = error.requestOptions;
            retryOptions.headers['Authorization'] = 'Bearer $newAccess';
            return handler.resolve(await dio.fetch(retryOptions));
          }
        } catch (_) {
          await _tokenStorage.clearTokens();
        }
        handler.next(error);
      },
    );
  }

  static InterceptorsWrapper _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        if (error.response?.data is Map<String, dynamic>) {
          final data = error.response!.data as Map<String, dynamic>;
          final message = data['message'] as String? ?? 'Something went wrong';
          error = error.copyWith(message: message);
        }
        handler.next(error);
      },
    );
  }

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

  static void reset() {
    _dio?.close();
    _dio = null;
  }
}
