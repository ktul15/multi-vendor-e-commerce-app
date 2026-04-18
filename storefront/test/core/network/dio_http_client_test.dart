import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/core/network/dio_http_client.dart';

class _MockDio extends Mock implements Dio {}

Response<dynamic> _response(dynamic data, {int statusCode = 200}) => Response(
      data: data,
      statusCode: statusCode,
      requestOptions: RequestOptions(path: '/test'),
    );

DioException _dioException({
  Response<dynamic>? response,
  DioExceptionType type = DioExceptionType.unknown,
  String? message,
}) =>
    DioException(
      requestOptions: RequestOptions(path: '/test'),
      response: response,
      type: type,
      message: message,
    );

void main() {
  late _MockDio mockDio;
  late DioHttpClient client;

  setUpAll(() {
    registerFallbackValue(RequestOptions(path: ''));
  });

  setUp(() {
    mockDio = _MockDio();
    client = DioHttpClient(mockDio);
  });

  group('DioHttpClient', () {
    // ── get ──────────────────────────────────────────────────────────────

    test('get returns parsed map on success', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _response({'key': 'value'}));

      final result = await client.get('/test');

      expect(result, {'key': 'value'});
    });

    test('get returns null when response body is null', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _response(null));

      final result = await client.get('/test');

      expect(result, isNull);
    });

    test('get returns null when response body is not a Map', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _response([1, 2, 3]));

      final result = await client.get('/test');

      expect(result, isNull);
    });

    test('get passes queryParameters to Dio', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _response({'data': 'ok'}));

      await client.get('/products', queryParameters: {'page': '1'});

      verify(() => mockDio.get<dynamic>(
            '/products',
            queryParameters: {'page': '1'},
          )).called(1);
    });

    // ── post ─────────────────────────────────────────────────────────────

    test('post returns parsed map on success', () async {
      when(() => mockDio.post<dynamic>(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response({'id': '123'}));

      final result = await client.post('/items', data: {'name': 'test'});

      expect(result, {'id': '123'});
    });

    // ── put ──────────────────────────────────────────────────────────────

    test('put returns parsed map on success', () async {
      when(() => mockDio.put<dynamic>(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response({'updated': true}));

      final result = await client.put('/items/1', data: {'name': 'new'});

      expect(result, {'updated': true});
    });

    // ── patch ─────────────────────────────────────────────────────────────

    test('patch returns parsed map on success', () async {
      when(() => mockDio.patch<dynamic>(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response({'patched': true}));

      final result = await client.patch('/items/1', data: {'qty': 2});

      expect(result, {'patched': true});
    });

    // ── delete ───────────────────────────────────────────────────────────

    test('delete returns null when response body is null', () async {
      when(() => mockDio.delete<dynamic>(any(), data: any(named: 'data')))
          .thenAnswer((_) async => _response(null, statusCode: 204));

      final result = await client.delete('/items/1');

      expect(result, isNull);
    });

    // ── exception conversion ─────────────────────────────────────────────

    test('throws ApiException sourced from e.message (not response body)',
        () async {
      // The Dio error interceptor promotes the body's message field into
      // DioException.message. _convert reads e.message, NOT e.response.data.
      // Using different strings here proves which source is used.
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(_dioException(
        response: _response({'message': 'body message'}, statusCode: 404),
        message: 'interceptor message', // _convert should use this
      ));

      await expectLater(
        () => client.get('/missing'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.message, 'message', 'interceptor message'),
        ),
      );
    });

    test('throws NetworkException for connection timeout', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(_dioException(type: DioExceptionType.connectionTimeout));

      await expectLater(
        () => client.get('/slow'),
        throwsA(
          isA<NetworkException>().having(
            (e) => e.message,
            'message',
            contains('timed out'),
          ),
        ),
      );
    });

    test('throws NetworkException for receive timeout', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(_dioException(type: DioExceptionType.receiveTimeout));

      await expectLater(
        () => client.get('/slow'),
        throwsA(isA<NetworkException>()),
      );
    });

    test('throws NetworkException for send timeout', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(_dioException(type: DioExceptionType.sendTimeout));

      await expectLater(
        () => client.get('/slow'),
        throwsA(
          isA<NetworkException>().having(
            (e) => e.message,
            'message',
            contains('timed out'),
          ),
        ),
      );
    });

    test('throws NetworkException for connection error', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(_dioException(type: DioExceptionType.connectionError));

      await expectLater(
        () => client.get('/test'),
        throwsA(
          isA<NetworkException>().having(
            (e) => e.message,
            'message',
            contains('No internet'),
          ),
        ),
      );
    });

    test('throws NetworkException with fallback message for other DioException types',
        () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(_dioException(
        type: DioExceptionType.cancel,
        message: 'Request cancelled',
      ));

      await expectLater(
        () => client.get('/test'),
        throwsA(
          isA<NetworkException>().having(
            (e) => e.message,
            'message',
            'Request cancelled',
          ),
        ),
      );
    });
  });
}
