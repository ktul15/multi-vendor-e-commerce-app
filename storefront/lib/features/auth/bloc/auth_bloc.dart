import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

/// AuthBloc — manages authentication state.
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
    : _authRepository = authRepository,
      super(AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthRegisterRequested>(_onRegisterRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
  }

  /// Auto-login: check stored tokens and fetch profile.
  Future<void> _onCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final hasTokens = await _authRepository.hasStoredTokens();
      if (!hasTokens) {
        emit(AuthUnauthenticated());
        return;
      }

      // Tokens exist — try to fetch profile (validates token)
      final user = await _authRepository.getProfile();
      emit(AuthAuthenticated(user: user));
    } catch (_) {
      emit(AuthUnauthenticated());
    }
  }

  /// Login with email/password.
  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.login(
        email: event.email,
        password: event.password,
      );
      emit(AuthAuthenticated(user: user));
    } on DioException catch (e) {
      emit(AuthError(message: e.message ?? 'Login failed'));
    } catch (e) {
      emit(AuthError(message: 'Something went wrong'));
    }
  }

  /// Register new account.
  Future<void> _onRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.register(
        name: event.name,
        email: event.email,
        password: event.password,
      );
      emit(AuthAuthenticated(user: user));
    } on DioException catch (e) {
      emit(AuthError(message: e.message ?? 'Registration failed'));
    } catch (e) {
      emit(AuthError(message: 'Something went wrong'));
    }
  }

  /// Logout — clear tokens and reset state.
  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _authRepository.logout();
    emit(AuthUnauthenticated());
  }
}
