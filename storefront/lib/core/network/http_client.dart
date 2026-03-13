import 'api_exception.dart';

/// Transport-agnostic HTTP interface used by all repositories.
///
/// Implementations must throw [ApiException] for non-2xx server responses
/// and [NetworkException] for connection/timeout failures.
/// Repositories never import a concrete HTTP package directly.
abstract class HttpClient {
  Future<Map<String, dynamic>?> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  });

  Future<Map<String, dynamic>?> post(
    String path, {
    dynamic data,
  });

  Future<Map<String, dynamic>?> put(
    String path, {
    dynamic data,
  });

  Future<Map<String, dynamic>?> patch(
    String path, {
    dynamic data,
  });

  Future<Map<String, dynamic>?> delete(
    String path, {
    dynamic data,
  });
}
