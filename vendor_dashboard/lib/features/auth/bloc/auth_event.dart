import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

/// Request to check if the user is already logged in via stored tokens.
class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

/// Request to log in with email and password.
class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;

  const AuthLoginRequested({required this.email, required this.password});

  @override
  List<Object> get props => [email, password];
}

/// Request to register a new vendor account.
class AuthRegisterRequested extends AuthEvent {
  final String name;
  final String email;
  final String password;
  final String storeName;

  const AuthRegisterRequested({
    required this.name,
    required this.email,
    required this.password,
    required this.storeName,
  });

  @override
  List<Object> get props => [name, email, password, storeName];
}

/// Request to log out.
class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}
