import 'package:equatable/equatable.dart';

/// Auth states — represent the current authentication status.
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Initial state — checking stored tokens.
class AuthInitial extends AuthState {}

/// Loading — login, register, or token check in progress.
class AuthLoading extends AuthState {}

/// Authenticated — user is logged in.
class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object?> get props => [user];
}

/// Unauthenticated — user is not logged in.
class AuthUnauthenticated extends AuthState {}

/// Auth error — login/register failed.
class AuthError extends AuthState {
  final String message;

  const AuthError({required this.message});

  @override
  List<Object?> get props => [message];
}
