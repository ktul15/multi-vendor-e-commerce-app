import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/error_messages.dart';
import '../../../repositories/auth_repository.dart';
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
    on<AuthRegisterRequested>(_onAuthRegisterRequested);
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
      emit(
        AuthError(
          message: userFacingDioErrorMessage(
            e,
            fallback: 'Login failed. Please try again.',
          ),
        ),
      );
    } catch (_) {
      emit(AuthError(message: 'An unexpected error occurred.'));
    }
  }

  Future<void> _onAuthRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.registerVendor(
        name: event.name,
        email: event.email,
        password: event.password,
        storeName: event.storeName,
      );
      emit(AuthAuthenticated(user: user));
    } on DioException catch (e) {
      emit(
        AuthError(
          message: userFacingDioErrorMessage(
            e,
            fallback: 'Registration failed. Please try again.',
          ),
        ),
      );
    } catch (_) {
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
