import 'package:dio/dio.dart';
import '../config/app_env.dart';

class ApiClient {
  ApiClient._();

  static final Dio _dio = _buildDio();

  /// Called when the server returns 401. Set this in DI after the AuthCubit
  /// is registered so a mid-session token expiry triggers a full logout.
  static void Function()? onUnauthenticated;

  static Dio _buildDio() {
    final dio = Dio(
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

    // On a 401, strip the stale header and notify the AuthCubit so the
    // router guard redirects to /login immediately — no page refresh needed.
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) {
          if (error.response?.statusCode == 401) {
            dio.options.headers.remove('Authorization');
            onUnauthenticated?.call();
          }
          handler.next(error);
        },
      ),
    );

    return dio;
  }

  static Dio get instance => _dio;

  static void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  static void clearAuthToken() {
    _dio.options.headers.remove('Authorization');
  }
}
