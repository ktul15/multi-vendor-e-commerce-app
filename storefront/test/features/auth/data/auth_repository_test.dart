import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/token_storage.dart';
import 'package:storefront/repositories/auth_repository.dart';

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

  group('AuthRepository', () {
    // ── login ──────────────────────────────────

    group('login', () {
      test('returns user data and saves tokens on successful login', () async {
        when(
          () => mockDio.post('/auth/login', data: any(named: 'data')),
        ).thenAnswer(
          (_) async => Response(
            requestOptions: RequestOptions(),
            statusCode: 200,
            data: {
              'success': true,
              'data': {
                'user': {
                  'id': '1',
                  'name': 'Test User',
                  'email': 'test@test.com',
                },
                'tokens': {
                  'accessToken': 'access_123',
                  'refreshToken': 'refresh_123',
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
          email: 'test@test.com',
          password: 'password123',
        );

        expect(user['id'], '1');
        expect(user['name'], 'Test User');
        expect(user['email'], 'test@test.com');

        verify(
          () => mockDio.post(
            '/auth/login',
            data: {'email': 'test@test.com', 'password': 'password123'},
          ),
        ).called(1);

        verify(
          () => mockTokenStorage.saveTokens(
            accessToken: 'access_123',
            refreshToken: 'refresh_123',
          ),
        ).called(1);
      });

      test('throws DioException on invalid credentials', () async {
        when(
          () => mockDio.post('/auth/login', data: any(named: 'data')),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(),
            response: Response(
              requestOptions: RequestOptions(),
              statusCode: 401,
              data: {'message': 'Invalid credentials'},
            ),
          ),
        );

        expect(
          () => authRepository.login(email: 'test@test.com', password: 'wrong'),
          throwsA(isA<DioException>()),
        );

        verifyNever(
          () => mockTokenStorage.saveTokens(
            accessToken: any(named: 'accessToken'),
            refreshToken: any(named: 'refreshToken'),
          ),
        );
      });
    });

    // ── register ──────────────────────────────

    group('register', () {
      test(
        'returns user data and saves tokens on successful registration',
        () async {
          when(
            () => mockDio.post('/auth/register', data: any(named: 'data')),
          ).thenAnswer(
            (_) async => Response(
              requestOptions: RequestOptions(),
              statusCode: 201,
              data: {
                'success': true,
                'data': {
                  'user': {
                    'id': '2',
                    'name': 'New User',
                    'email': 'new@test.com',
                  },
                  'tokens': {
                    'accessToken': 'access_456',
                    'refreshToken': 'refresh_456',
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

          final user = await authRepository.register(
            name: 'New User',
            email: 'new@test.com',
            password: 'password123',
          );

          expect(user['id'], '2');
          expect(user['name'], 'New User');

          verify(
            () => mockTokenStorage.saveTokens(
              accessToken: 'access_456',
              refreshToken: 'refresh_456',
            ),
          ).called(1);
        },
      );

      test('throws DioException when email already exists', () async {
        when(
          () => mockDio.post('/auth/register', data: any(named: 'data')),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(),
            response: Response(
              requestOptions: RequestOptions(),
              statusCode: 409,
              data: {'message': 'Email already exists'},
            ),
          ),
        );

        expect(
          () => authRepository.register(
            name: 'User',
            email: 'exists@test.com',
            password: 'password123',
          ),
          throwsA(isA<DioException>()),
        );
      });
    });

    // ── getProfile ────────────────────────────

    group('getProfile', () {
      test('returns user profile data', () async {
        when(() => mockDio.get('/auth/profile')).thenAnswer(
          (_) async => Response(
            requestOptions: RequestOptions(),
            statusCode: 200,
            data: {
              'success': true,
              'data': {
                'id': '1',
                'name': 'Test User',
                'email': 'test@test.com',
                'role': 'CUSTOMER',
              },
            },
          ),
        );

        final user = await authRepository.getProfile();

        expect(user['id'], '1');
        expect(user['role'], 'CUSTOMER');
      });

      test('throws DioException on 401 unauthorized', () async {
        when(() => mockDio.get('/auth/profile')).thenThrow(
          DioException(
            requestOptions: RequestOptions(),
            response: Response(
              requestOptions: RequestOptions(),
              statusCode: 401,
            ),
          ),
        );

        expect(() => authRepository.getProfile(), throwsA(isA<DioException>()));
      });
    });

    // ── logout ────────────────────────────────

    group('logout', () {
      test('clears tokens and calls logout API', () async {
        when(
          () => mockTokenStorage.getRefreshToken(),
        ).thenAnswer((_) async => 'refresh_123');
        when(
          () => mockDio.post('/auth/logout', data: any(named: 'data')),
        ).thenAnswer(
          (_) async =>
              Response(requestOptions: RequestOptions(), statusCode: 200),
        );
        when(() => mockTokenStorage.clearTokens()).thenAnswer((_) async {});

        await authRepository.logout();

        verify(
          () => mockDio.post(
            '/auth/logout',
            data: {'refreshToken': 'refresh_123'},
          ),
        ).called(1);
        verify(() => mockTokenStorage.clearTokens()).called(1);
      });

      test('clears tokens even if logout API fails', () async {
        when(
          () => mockTokenStorage.getRefreshToken(),
        ).thenAnswer((_) async => 'refresh_123');
        when(
          () => mockDio.post('/auth/logout', data: any(named: 'data')),
        ).thenThrow(DioException(requestOptions: RequestOptions()));
        when(() => mockTokenStorage.clearTokens()).thenAnswer((_) async {});

        await authRepository.logout();

        verify(() => mockTokenStorage.clearTokens()).called(1);
      });
    });

    // ── hasStoredTokens ───────────────────────

    group('hasStoredTokens', () {
      test('returns true when tokens exist', () async {
        when(() => mockTokenStorage.hasTokens()).thenAnswer((_) async => true);

        final result = await authRepository.hasStoredTokens();
        expect(result, true);
      });

      test('returns false when no tokens', () async {
        when(() => mockTokenStorage.hasTokens()).thenAnswer((_) async => false);

        final result = await authRepository.hasStoredTokens();
        expect(result, false);
      });
    });
  });
}
