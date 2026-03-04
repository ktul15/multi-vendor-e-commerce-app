import 'package:flutter_test/flutter_test.dart';
import 'package:admin_panel/main.dart';

void main() {
  testWidgets('App should render', (WidgetTester tester) async {
    await tester.pumpWidget(const AdminPanelApp());

    expect(find.text('Admin Panel'), findsOneWidget);
  });
}
