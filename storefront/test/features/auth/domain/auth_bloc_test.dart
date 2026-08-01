import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/config/injection_container.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/core/services/push_notification_service.dart';
import 'package:storefront/features/notifications/bloc/notification_cubit.dart';
import 'package:storefront/repositories/auth_repository.dart';
import 'package:storefront/features/auth/bloc/auth_bloc.dart';
import 'package:storefront/features/auth/bloc/auth_event.dart';
import 'package:storefront/features/auth/bloc/auth_state.dart';
import 'package:storefront/features/wishlist/bloc/wishlist_cubit.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

class MockPushNotificationService extends Mock
    implements PushNotificationService {}

class MockNotificationCubit extends Mock implements NotificationCubit {}

class MockWishlistCubit extends Mock implements WishlistCubit {}

void main() {
  late MockAuthRepository mockAuthRepository;
  late MockPushNotificationService mockPushNotificationService;
  late MockNotificationCubit mockNotificationCubit;
  late MockWishlistCubit mockWishlistCubit;

  setUp(() async {
    await sl.reset();
    mockAuthRepository = MockAuthRepository();
    mockPushNotificationService = MockPushNotificationService();
    mockNotificationCubit = MockNotificationCubit();
    mockWishlistCubit = MockWishlistCubit();

    when(
      () => mockPushNotificationService.initialize(),
    ).thenAnswer((_) async {});
    when(() => mockNotificationCubit.init()).thenAnswer((_) async {});
    when(() => mockWishlistCubit.loadWishlist()).thenAnswer((_) async {});

    sl.registerLazySingleton<PushNotificationService>(
      () => mockPushNotificationService,
    );
    sl.registerLazySingleton<NotificationCubit>(() => mockNotificationCubit);
    sl.registerLazySingleton<WishlistCubit>(() => mockWishlistCubit);
  });

  tearDown(() async {
    await sl.reset();
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
      act: (bloc) => bloc.add(AuthCheckRequested()),
      expect: () => [isA<AuthLoading>(), isA<AuthUnauthenticated>()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when valid stored tokens exist',
      build: () {
        when(
          () => mockAuthRepository.hasStoredTokens(),
        ).thenAnswer((_) async => true);
        when(() => mockAuthRepository.getProfile()).thenAnswer(
          (_) async => {
            'id': '1',
            'name': 'Test User',
            'email': 'test@test.com',
          },
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(AuthCheckRequested()),
      expect: () => [isA<AuthLoading>(), isA<AuthAuthenticated>()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when stored tokens are expired',
      build: () {
        when(
          () => mockAuthRepository.hasStoredTokens(),
        ).thenAnswer((_) async => true);
        when(
          () => mockAuthRepository.getProfile(),
        ).thenThrow(const ApiException('Unauthorized', statusCode: 401));
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(AuthCheckRequested()),
      expect: () => [isA<AuthLoading>(), isA<AuthUnauthenticated>()],
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
          (_) async => {
            'id': '1',
            'name': 'Test User',
            'email': 'test@test.com',
          },
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(
        const AuthLoginRequested(
          email: 'test@test.com',
          password: 'password123',
        ),
      ),
      expect: () => [isA<AuthLoading>(), isA<AuthAuthenticated>()],
      verify: (_) {
        verify(
          () => mockAuthRepository.login(
            email: 'test@test.com',
            password: 'password123',
          ),
        ).called(1);
      },
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthError] on login failure',
      build: () {
        when(
          () => mockAuthRepository.login(
            email: any(named: 'email'),
            password: any(named: 'password'),
          ),
        ).thenThrow(const ApiException('Invalid credentials', statusCode: 401));
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(
        const AuthLoginRequested(email: 'test@test.com', password: 'wrong'),
      ),
      expect: () => [
        isA<AuthLoading>(),
        isA<AuthError>().having(
          (e) => e.message,
          'message',
          'Invalid credentials',
        ),
      ],
    );

    // ── AuthRegisterRequested ─────────────────

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] on successful registration',
      build: () {
        when(
          () => mockAuthRepository.register(
            name: any(named: 'name'),
            email: any(named: 'email'),
            password: any(named: 'password'),
          ),
        ).thenAnswer(
          (_) async => {'id': '1', 'name': 'New User', 'email': 'new@test.com'},
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(
        const AuthRegisterRequested(
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
        ),
      ),
      expect: () => [isA<AuthLoading>(), isA<AuthAuthenticated>()],
      verify: (_) {
        verify(
          () => mockAuthRepository.register(
            name: 'New User',
            email: 'new@test.com',
            password: 'password123',
          ),
        ).called(1);
      },
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthError] when email already exists',
      build: () {
        when(
          () => mockAuthRepository.register(
            name: any(named: 'name'),
            email: any(named: 'email'),
            password: any(named: 'password'),
          ),
        ).thenThrow(
          const ApiException('Email already exists', statusCode: 409),
        );
        return AuthBloc(authRepository: mockAuthRepository);
      },
      act: (bloc) => bloc.add(
        const AuthRegisterRequested(
          name: 'User',
          email: 'exists@test.com',
          password: 'password123',
        ),
      ),
      expect: () => [
        isA<AuthLoading>(),
        isA<AuthError>().having(
          (e) => e.message,
          'message',
          'Email already exists',
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
      act: (bloc) => bloc.add(AuthLogoutRequested()),
      expect: () => [isA<AuthUnauthenticated>()],
      verify: (_) {
        verify(() => mockAuthRepository.logout()).called(1);
      },
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthUnauthenticated] when the API session expires',
      build: () => AuthBloc(authRepository: mockAuthRepository),
      seed: () =>
          const AuthAuthenticated(user: {'id': '1', 'email': 'test@test.com'}),
      act: (bloc) => bloc.add(AuthSessionExpired()),
      expect: () => [isA<AuthUnauthenticated>()],
      verify: (_) => verifyNever(() => mockAuthRepository.logout()),
    );
  });
}
