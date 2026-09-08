import 'package:dio/dio.dart';

const genericNetworkErrorMessage =
    'The server is currently unavailable. Please try again later.';

const genericServerErrorMessage =
    'Something went wrong. Please try again later.';

String userFacingErrorMessage(
  Object error, {
  String fallback = genericServerErrorMessage,
}) {
  if (error is DioException) {
    return userFacingDioErrorMessage(error, fallback: fallback);
  }

  return fallback;
}

String userFacingDioErrorMessage(
  DioException error, {
  String fallback = genericServerErrorMessage,
}) {
  final responseMessage = _responseMessage(error);
  if (responseMessage != null) {
    return responseMessage;
  }

  return switch (error.type) {
    DioExceptionType.connectionError ||
    DioExceptionType.connectionTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.sendTimeout => genericNetworkErrorMessage,
    DioExceptionType.badCertificate => genericNetworkErrorMessage,
    DioExceptionType.cancel => 'Request cancelled. Please try again.',
    DioExceptionType.badResponse => fallback,
    DioExceptionType.unknown => genericNetworkErrorMessage,
  };
}

String? _responseMessage(DioException error) {
  final data = error.response?.data;
  if (data is Map<String, dynamic>) {
    final message = data['message'];
    if (message is String && message.trim().isNotEmpty) {
      return message;
    }
  }

  return null;
}
