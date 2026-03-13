import 'package:dio/dio.dart';
import 'api_exception.dart';
import 'http_client.dart';

/// Dio-backed implementation of [HttpClient].
///
/// This is the ONLY file in the storefront that imports `package:dio/dio.dart`.
/// Swapping the transport layer (e.g. to `package:http`) means rewriting only
/// this class — no repository or BLoC needs to change.
class DioHttpClient implements HttpClient {
  final Dio _dio;

  DioHttpClient(this._dio);

  @override
  Future<Map<String, dynamic>?> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) =>
      _execute(() => _dio.get<dynamic>(path, queryParameters: queryParameters));

  @override
  Future<Map<String, dynamic>?> post(String path, {dynamic data}) =>
      _execute(() => _dio.post<dynamic>(path, data: data));

  @override
  Future<Map<String, dynamic>?> put(String path, {dynamic data}) =>
      _execute(() => _dio.put<dynamic>(path, data: data));

  @override
  Future<Map<String, dynamic>?> patch(String path, {dynamic data}) =>
      _execute(() => _dio.patch<dynamic>(path, data: data));

  @override
  Future<Map<String, dynamic>?> delete(String path, {dynamic data}) =>
      _execute(() => _dio.delete<dynamic>(path, data: data));

  Future<Map<String, dynamic>?> _execute(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      final body = response.data;
      if (body == null) return null;
      if (body is Map<String, dynamic>) return body;
      return null;
    } on DioException catch (e) {
      throw _convert(e);
    }
  }

  /// Converts a [DioException] into an [ApiException] or [NetworkException].
  ///
  /// The [ApiClient] error interceptor has already extracted the server's
  /// `message` field into [DioException.message] for 4xx/5xx responses,
  /// so we can use it directly.
  Exception _convert(DioException e) {
    if (e.response != null) {
      return ApiException(
        e.message ?? 'Request failed',
        statusCode: e.response!.statusCode,
      );
    }

    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout =>
        const NetworkException(
            'Connection timed out. Check your internet and try again.'),
      DioExceptionType.connectionError =>
        const NetworkException('No internet connection. Please try again.'),
      _ => NetworkException(
          e.message ?? 'Something went wrong. Please try again.'),
    };
  }
}
