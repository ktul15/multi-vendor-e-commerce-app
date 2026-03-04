import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_dashboard/main.dart';

void main() {
  testWidgets('App should render', (WidgetTester tester) async {
    await tester.pumpWidget(const VendorDashboardApp());

    expect(find.text('Vendor Dashboard'), findsOneWidget);
  });
}
