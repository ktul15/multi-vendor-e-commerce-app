import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';
import 'package:storefront/core/config/injection_container.dart';
import 'package:storefront/features/auth/domain/auth_bloc.dart';
import 'package:storefront/features/auth/presentation/login_screen.dart';

void main() {
  setUpAll(() async {
    await initDependencies();
  });

  testWidgets('LoginScreen should render email and password fields', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider(
          create: (_) => sl<AuthBloc>(),
          child: const LoginScreen(),
        ),
      ),
    );

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });
}
