import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/features/auth/bloc/auth_bloc.dart';
import 'package:storefront/features/auth/bloc/auth_event.dart';
import 'package:storefront/features/auth/bloc/auth_state.dart';
import 'package:storefront/features/auth/view/login_page.dart';
import '../../../mocks.dart';

// Fake used as a fallback value so `any()` works for sealed AuthEvent.
class _FakeAuthEvent extends Fake implements AuthEvent {}

void main() {
  late MockAuthBloc mockAuthBloc;

  setUpAll(() {
    registerFallbackValue(_FakeAuthEvent());
    // Register the concrete type so any<AuthLoginRequested>() works in verifyNever.
    registerFallbackValue(const AuthLoginRequested(email: '', password: ''));
  });

  setUp(() {
    mockAuthBloc = MockAuthBloc();
  });

  Widget buildPage() => MaterialApp(
        home: BlocProvider<AuthBloc>.value(
          value: mockAuthBloc,
          child: const LoginPage(),
        ),
      );

  void stubInitialState(AuthState state) {
    when(() => mockAuthBloc.state).thenReturn(state);
    when(() => mockAuthBloc.stream)
        .thenAnswer((_) => Stream<AuthState>.empty());
  }

  group('LoginPage', () {
    testWidgets('renders key UI elements in initial state', (tester) async {
      stubInitialState(AuthInitial());

      await tester.pumpWidget(buildPage());

      expect(find.text('Welcome back'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Forgot password?'), findsOneWidget);
    });

    testWidgets('shows validation errors when submitted with empty fields',
        (tester) async {
      stubInitialState(AuthInitial());

      await tester.pumpWidget(buildPage());
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
      verifyNever(() => mockAuthBloc.add(any<AuthLoginRequested>()));
    });

    testWidgets('shows validation error for invalid email format',
        (tester) async {
      stubInitialState(AuthInitial());

      await tester.pumpWidget(buildPage());
      await tester.enterText(find.byType(TextFormField).first, 'notanemail');
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Enter a valid email'), findsOneWidget);
    });

    testWidgets('dispatches AuthLoginRequested on valid form submission',
        (tester) async {
      stubInitialState(AuthInitial());

      await tester.pumpWidget(buildPage());
      await tester.enterText(
          find.byType(TextFormField).first, 'user@example.com');
      await tester.enterText(find.byType(TextFormField).last, 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      verify(() => mockAuthBloc.add(
            const AuthLoginRequested(
              email: 'user@example.com',
              password: 'password123',
            ),
          )).called(1);
    });

    testWidgets('shows CircularProgressIndicator in button when AuthLoading',
        (tester) async {
      stubInitialState(AuthLoading());

      await tester.pumpWidget(buildPage());

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      final elevatedButton =
          tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(elevatedButton.onPressed, isNull);
    });

    testWidgets('shows error SnackBar when AuthError is emitted',
        (tester) async {
      final streamController = StreamController<AuthState>.broadcast();
      // Guaranteed cleanup even if the assertion below throws.
      addTearDown(streamController.close);

      when(() => mockAuthBloc.state).thenReturn(AuthInitial());
      when(() => mockAuthBloc.stream)
          .thenAnswer((_) => streamController.stream);

      await tester.pumpWidget(buildPage());

      streamController.add(const AuthError(message: 'Invalid credentials'));
      await tester.pump(); // Let stream event be processed by BlocListener
      await tester.pump(const Duration(milliseconds: 100)); // SnackBar animates in

      expect(find.text('Invalid credentials'), findsOneWidget);
    });
  });
}
