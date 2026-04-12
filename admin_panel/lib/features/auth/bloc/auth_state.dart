import 'package:equatable/equatable.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Initial state — checking stored tokens.
class AuthInitial extends AuthState {}

/// Token check or login in progress.
class AuthLoading extends AuthState {}

/// Admin is authenticated.
class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;

  const AuthAuthenticated({required this.user});

  @override
  List<Object?> get props => [user];
}

/// No valid session — user must log in.
class AuthUnauthenticated extends AuthState {}

/// Login failed.
class AuthError extends AuthState {
  final String message;

  const AuthError({required this.message});

  @override
  List<Object?> get props => [message];
}
