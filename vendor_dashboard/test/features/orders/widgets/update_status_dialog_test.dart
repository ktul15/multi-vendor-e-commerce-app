import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_dashboard/features/orders/widgets/update_status_dialog.dart';
import 'package:vendor_dashboard/shared/models/vendor_order.dart';

void main() {
  VendorOrder orderWithStatus(String status) => VendorOrder(
    id: 'vendor-order-1',
    status: status,
    subtotal: 499,
    createdAt: DateTime(2026),
    orderNumber: 'ORDER-001',
    items: const [],
  );

  testWidgets('shows the next status without a dropdown', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: UpdateStatusDialog(order: orderWithStatus('CONFIRMED')),
      ),
    );

    expect(find.text('Next Status'), findsOneWidget);
    expect(find.text('PROCESSING'), findsOneWidget);
    expect(find.byType(DropdownButtonFormField<String>), findsNothing);
  });

  testWidgets('shows tracking fields when the next status is shipped', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: UpdateStatusDialog(order: orderWithStatus('PROCESSING')),
      ),
    );

    expect(find.text('SHIPPED'), findsOneWidget);
    expect(find.text('Tracking Number'), findsOneWidget);
    expect(find.text('Carrier (e.g. FedEx)'), findsOneWidget);
  });
}
