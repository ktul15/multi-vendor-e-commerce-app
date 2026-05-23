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
  /// Falls back to a generic connection message for transport errors so raw
  /// Dio/browser implementation details are not shown in the UI.
  String get errorMessage {
    if (response != null) {
      final data = response?.data;
      if (data is Map && data['message'] is String) {
        return data['message'] as String;
      }
      return 'Request failed (${response?.statusCode})';
    }

    return switch (type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'The request timed out. Please try again.',
      DioExceptionType.connectionError || DioExceptionType.unknown =>
        'Unable to connect. Check your internet connection and try again.',
      DioExceptionType.cancel => 'Request cancelled. Please try again.',
      DioExceptionType.badCertificate =>
        'Unable to establish a secure connection.',
      DioExceptionType.badResponse => 'Request failed. Please try again.',
    };
  }
}
