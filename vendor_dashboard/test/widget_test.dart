import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';
import 'package:vendor_dashboard/core/config/injection_container.dart';
import 'package:vendor_dashboard/features/auth/bloc/auth_bloc.dart';
import 'package:vendor_dashboard/features/auth/view/login_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await initDependencies();
  });

  testWidgets('VendorLoginPage should render email and password fields', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider(
          create: (_) => sl<AuthBloc>(),
          child: const VendorLoginPage(),
        ),
      ),
    );

    expect(find.text('Vendor Portal'), findsOneWidget);
    expect(find.text('Sign In to Dashboard'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });
}
