import 'package:equatable/equatable.dart';

/// Auth events — user actions that trigger state changes.
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check if user has stored tokens on app startup.
class AuthCheckRequested extends AuthEvent {}

/// User taps "Login".
class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object?> get props => [email, password];
}

/// User taps "Register".
class AuthRegisterRequested extends AuthEvent {
  final String name;
  final String email;
  final String password;

  const AuthRegisterRequested({
    required this.name,
    required this.email,
    required this.password,
  });

  @override
  List<Object?> get props => [name, email, password];
}

/// User taps "Logout".
class AuthLogoutRequested extends AuthEvent {}
