import 'package:dio/dio.dart';
import '../config/app_env.dart';

class ApiClient {
  ApiClient._();

  static const skipAuthRefreshKey = 'skipAuthRefresh';
  static const retriedAfterRefreshKey = 'retriedAfterRefresh';

  static final Dio _dio = _buildDio();
  static Future<bool>? _refreshFuture;

  /// Called when a 401 cannot be recovered by refreshing the access token.
  static void Function()? onUnauthenticated;

  /// Called when a request returns 401. Set in DI after AuthRepository is
  /// registered so the client can refresh and retry before logging out.
  static Future<bool> Function()? refreshAuthToken;

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

    // On a 401, refresh the access token and retry the failed request once.
    // If refresh fails, notify the AuthCubit so the router redirects to login.
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            final requestOptions = error.requestOptions;
            final shouldSkipRefresh =
                requestOptions.extra[skipAuthRefreshKey] == true;
            final alreadyRetried =
                requestOptions.extra[retriedAfterRefreshKey] == true;

            if (!shouldSkipRefresh && !alreadyRetried) {
              final refreshed = await _refreshAccessToken();
              if (refreshed) {
                requestOptions.extra[retriedAfterRefreshKey] = true;
                requestOptions.headers['Authorization'] =
                    dio.options.headers['Authorization'];
                try {
                  final response = await dio.fetch<dynamic>(requestOptions);
                  handler.resolve(response);
                  return;
                } on DioException catch (retryError) {
                  handler.next(retryError);
                  return;
                }
              }
            }

            clearAuthToken();
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

  static Future<bool> _refreshAccessToken() {
    final refresh = refreshAuthToken;
    if (refresh == null) return Future.value(false);

    final existingRefresh = _refreshFuture;
    if (existingRefresh != null) return existingRefresh;

    final nextRefresh = refresh().whenComplete(() => _refreshFuture = null);
    _refreshFuture = nextRefresh;
    return nextRefresh;
  }
}
