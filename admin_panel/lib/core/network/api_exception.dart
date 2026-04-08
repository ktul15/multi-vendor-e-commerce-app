import 'package:dio/dio.dart';

/// Thrown when the server returns a non-2xx response.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException: $message';
}

extension DioExceptionMessage on DioException {
  /// Extracts a human-readable error message from a [DioException].
  /// Falls back to the HTTP status code or a generic network error string.
  String get errorMessage {
    if (response != null) {
      final data = response?.data;
      if (data is Map && data['message'] is String) {
        return data['message'] as String;
      }
      return 'Request failed (${response?.statusCode})';
    }
    return message ?? 'Network error';
  }
}
