import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:vendor_dashboard/repositories/auth_repository.dart';
import 'package:vendor_dashboard/features/auth/bloc/auth_bloc.dart';
import 'package:vendor_dashboard/features/auth/bloc/auth_event.dart';
import 'package:vendor_dashboard/features/auth/bloc/auth_state.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository mockAuthRepository;

  setUp(() {
    mockAuthRepository = MockAuthRepository();
  });

  group('AuthBloc', () {
    // ── AuthCheckRequested ─────────────────────

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when no stored tokens',
      build: () {
        when(
          () => mockAuthRepository.hasStoredTokens(),
        ).thenAnswer((_) async => false);
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(const AuthCheckRequested()),
      expect: () => [isA<AuthLoading>(), isA<AuthUnauthenticated>()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when valid stored tokens exist',
      build: () {
        when(
          () => mockAuthRepository.hasStoredTokens(),
        ).thenAnswer((_) async => true);
        when(() => mockAuthRepository.getProfile()).thenAnswer(
          (_) async => {'id': '1', 'name': 'Vendor', 'role': 'VENDOR'},
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(const AuthCheckRequested()),
      expect: () => [
        isA<AuthLoading>(),
        isA<AuthAuthenticated>().having(
          (s) => s.user['role'],
          'role',
          'VENDOR',
        ),
      ],
    );

    // ── AuthLoginRequested ────────────────────

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] on successful login',
      build: () {
        when(
          () => mockAuthRepository.login(
            email: any(named: 'email'),
            password: any(named: 'password'),
          ),
        ).thenAnswer(
          (_) async => {'id': '1', 'name': 'Vendor', 'role': 'VENDOR'},
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(
        const AuthLoginRequested(
          email: 'vendor@test.com',
          password: 'password123',
        ),
      ),
      expect: () => [isA<AuthLoading>(), isA<AuthAuthenticated>()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthError] on login failure or customer role',
      build: () {
        when(
          () => mockAuthRepository.login(
            email: any(named: 'email'),
            password: any(named: 'password'),
          ),
        ).thenThrow(
          DioException(
            requestOptions: RequestOptions(),
            response: Response(
              requestOptions: RequestOptions(),
              statusCode: 403,
              data: {
                'message': 'Unauthorized access. Vendor account required.',
              },
            ),
          ),
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(
        const AuthLoginRequested(
          email: 'customer@test.com',
          password: 'password123',
        ),
      ),
      expect: () => [
        isA<AuthLoading>(),
        isA<AuthError>().having(
          (e) => e.message,
          'message',
          'Unauthorized access. Vendor account required.',
        ),
      ],
    );

    // ── AuthLogoutRequested ───────────────────

    blocTest<AuthBloc, AuthState>(
      'emits [AuthUnauthenticated] on logout',
      build: () {
        when(() => mockAuthRepository.logout()).thenAnswer((_) async {});
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(const AuthLogoutRequested()),
      expect: () => [isA<AuthLoading>(), isA<AuthUnauthenticated>()],
    );
  });
}
