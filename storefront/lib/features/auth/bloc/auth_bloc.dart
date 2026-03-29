import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/services/push_notification_service.dart';
import '../../../features/notifications/bloc/notification_cubit.dart';
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

  /// Initialize push notifications and notification cubit after authentication.
  Future<void> _initNotifications() async {
    try {
      await sl<PushNotificationService>().initialize();
      await sl<NotificationCubit>().init();
    } catch (e) {
      debugPrint('Error initializing notifications: $e');
      // Non-critical — app works without push notifications
    }
  }

  /// Clean up push notifications on logout.
  /// Backend logout already clears the FCM token, so no explicit removeFcmToken() call needed.
  void _cleanupNotifications() {
    sl<PushNotificationService>().dispose();
    sl<NotificationCubit>().reset();
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
      final user = await _authRepository.getProfile();
      emit(AuthAuthenticated(user: user));
      unawaited(_initNotifications());
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
      unawaited(_initNotifications());
    } on ApiException catch (e) {
      emit(AuthError(message: e.message));
    } on NetworkException catch (e) {
      emit(AuthError(message: e.message));
    } catch (_) {
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
      unawaited(_initNotifications());
    } on ApiException catch (e) {
      emit(AuthError(message: e.message));
    } on NetworkException catch (e) {
      emit(AuthError(message: e.message));
    } catch (_) {
      emit(AuthError(message: 'Something went wrong'));
    }
  }

  /// Logout — clear tokens, cleanup notifications, and reset state.
  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    _cleanupNotifications();
    await _authRepository.logout();
    emit(AuthUnauthenticated());
  }
}
