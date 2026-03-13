/// Thrown when the server returns a non-2xx response.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Thrown on transport-level failures: no connection, timeout, etc.
class NetworkException implements Exception {
  final String message;

  const NetworkException(this.message);

  @override
  String toString() => message;
}
