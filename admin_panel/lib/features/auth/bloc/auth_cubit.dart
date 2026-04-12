import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/auth_repository.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepository _authRepository;

  AuthCubit({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(AuthInitial());

  /// Auto-login: restore token from storage and verify with a profile fetch.
  Future<void> checkAuth() async {
    emit(AuthLoading());
    try {
      final hasTokens = await _authRepository.hasStoredTokens();
      if (!hasTokens) {
        emit(AuthUnauthenticated());
        return;
      }
      await _authRepository.restoreToken();
      final user = await _authRepository.getProfile();
      // Re-verify role on every startup — guards against a stored non-admin
      // token that slipped through (e.g., role changed server-side).
      if (user['role'] != 'ADMIN') {
        await _authRepository.logout();
        emit(AuthUnauthenticated());
        return;
      }
      emit(AuthAuthenticated(user: user));
    } on ApiException catch (e) {
      // 401/403 means the token is invalid or revoked — clear it.
      if (e.statusCode == 401 || e.statusCode == 403) {
        await _authRepository.logout();
      }
      // For any other API error (5xx, network) keep tokens so the next
      // app launch can retry; just block access for this session.
      emit(AuthUnauthenticated());
    } catch (_) {
      // Transient network error — keep tokens, block access for this session.
      emit(AuthUnauthenticated());
    }
  }

  /// Login with email and password.
  /// Role enforcement is done in the repository before tokens are saved.
  Future<void> login({required String email, required String password}) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.login(
        email: email,
        password: password,
      );
      emit(AuthAuthenticated(user: user));
    } on ApiException catch (e) {
      emit(AuthError(message: e.message));
    } catch (_) {
      emit(const AuthError(message: 'Something went wrong. Please try again.'));
    }
  }

  /// Logout — clear tokens and reset to unauthenticated.
  Future<void> logout() async {
    await _authRepository.logout();
    emit(AuthUnauthenticated());
  }
}
