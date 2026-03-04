import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

/// Request to check if the user is already logged in via stored tokens.
class AuthCheckRequested extends AuthEvent {}

/// Request to log in with email and password.
class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object> get props => [email, password];
}

/// Request to log out.
class AuthLogoutRequested extends AuthEvent {}
