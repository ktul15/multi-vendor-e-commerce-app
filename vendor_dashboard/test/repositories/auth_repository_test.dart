import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vendor_dashboard/core/network/token_storage.dart';
import 'package:vendor_dashboard/repositories/auth_repository.dart';

class MockDio extends Mock implements Dio {}

class MockTokenStorage extends Mock implements TokenStorage {}

void main() {
  late MockDio mockDio;
  late MockTokenStorage mockTokenStorage;
  late AuthRepository authRepository;

  setUp(() {
    mockDio = MockDio();
    mockTokenStorage = MockTokenStorage();
    authRepository = AuthRepository(
      dio: mockDio,
      tokenStorage: mockTokenStorage,
    );
  });

  group('AuthRepository (Vendor)', () {
    group('login', () {
      test('returns user and saves tokens when role is VENDOR', () async {
        when(
          () => mockDio.post('/auth/login', data: any(named: 'data')),
        ).thenAnswer(
          (_) async => Response(
            requestOptions: RequestOptions(),
            statusCode: 200,
            data: {
              'data': {
                'user': {'id': '1', 'role': 'VENDOR'},
                'tokens': {
                  'accessToken': 'access1',
                  'refreshToken': 'refresh1',
                },
              },
            },
          ),
        );
        when(
          () => mockTokenStorage.saveTokens(
            accessToken: any(named: 'accessToken'),
            refreshToken: any(named: 'refreshToken'),
          ),
        ).thenAnswer((_) async {});

        final user = await authRepository.login(
          email: 'vendor@test.com',
          password: 'test',
        );

        expect(user['role'], 'VENDOR');
        verify(
          () => mockTokenStorage.saveTokens(
            accessToken: 'access1',
            refreshToken: 'refresh1',
          ),
        ).called(1);
      });

      test('throws DioException 403 when role is CUSTOMER', () async {
        when(
          () => mockDio.post('/auth/login', data: any(named: 'data')),
        ).thenAnswer(
          (_) async => Response(
            requestOptions: RequestOptions(),
            statusCode: 200,
            data: {
              'data': {
                'user': {'id': '1', 'role': 'CUSTOMER'},
                'tokens': {
                  'accessToken': 'access1',
                  'refreshToken': 'refresh1',
                },
              },
            },
          ),
        );

        await expectLater(
          () => authRepository.login(
            email: 'customer@test.com',
            password: 'test',
          ),
          throwsA(
            isA<DioException>().having(
              (e) => e.response?.statusCode,
              'statusCode',
              403,
            ),
          ),
        );
        verifyNever(
          () => mockTokenStorage.saveTokens(
            accessToken: any(named: 'accessToken'),
            refreshToken: any(named: 'refreshToken'),
          ),
        );
      });
    });

    group('getProfile', () {
      test('throws DioException 403 if profile role is CUSTOMER', () async {
        when(() => mockDio.get('/auth/profile')).thenAnswer(
          (_) async => Response(
            requestOptions: RequestOptions(),
            statusCode: 200,
            data: {
              'data': {'id': '1', 'role': 'CUSTOMER'},
            },
          ),
        );

        await expectLater(
          () => authRepository.getProfile(),
          throwsA(
            isA<DioException>().having(
              (e) => e.response?.statusCode,
              'statusCode',
              403,
            ),
          ),
        );
      });
    });
  });
}
