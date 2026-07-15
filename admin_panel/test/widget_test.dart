import 'package:flutter_test/flutter_test.dart';
import 'package:admin_panel/main.dart';
import 'package:admin_panel/core/config/injection_container.dart';
import 'package:admin_panel/features/auth/bloc/auth_cubit.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    await sl.reset();
    await initDependencies();
    await sl<AuthCubit>().checkAuth();
  });

  testWidgets('App should render', (WidgetTester tester) async {
    await tester.pumpWidget(const AdminPanelApp());
    await tester.pumpAndSettle();

    expect(find.text('Admin Login'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });
}
