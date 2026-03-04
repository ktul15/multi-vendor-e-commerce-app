import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

/// Manages authentication state for the Vendor Dashboard.
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
    : _authRepository = authRepository,
      super(AuthInitial()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final hasTokens = await _authRepository.hasStoredTokens();
      if (!hasTokens) {
        return emit(AuthUnauthenticated());
      }

      // Tokens exist, verify them by fetching the profile
      final user = await _authRepository.getProfile();
      emit(AuthAuthenticated(user: user));
    } catch (_) {
      // Token invalid or network error — fall back to unauthenticated
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onAuthLoginRequested(
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
      final message =
          e.response?.data is Map<String, dynamic> &&
              e.response?.data['message'] != null
          ? e.response?.data['message'] as String
          : e.message ?? 'Login failed. Please try again.';
      emit(AuthError(message: message));
    } catch (e) {
      emit(AuthError(message: 'An unexpected error occurred.'));
    }
  }

  Future<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    await _authRepository.logout();
    emit(AuthUnauthenticated());
  }
}
