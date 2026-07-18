import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:storefront/shared/widgets/overflow_safe_text.dart';

void main() {
  Widget host(Widget child, {double width = 240, double textScale = 1}) {
    return MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
        child: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(width: width, child: child),
          ),
        ),
      ),
    );
  }

  testWidgets('single-line and table text remain bounded', (tester) async {
    await tester.pumpWidget(
      host(
        const Column(
          children: [
            SingleLineText('An intentionally extremely long metadata value'),
            TableCellText('An intentionally extremely long table value'),
          ],
        ),
        width: 120,
      ),
    );

    expect(tester.takeException(), isNull);
    for (final text in tester.widgetList<Text>(find.byType(Text))) {
      expect(text.maxLines, 1);
      expect(text.overflow, TextOverflow.ellipsis);
    }
  });

  testWidgets('metadata stacks at narrow width and large text scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        const ResponsiveMetadataRow(
          label: 'An intentionally long label',
          value: 'An intentionally long value',
        ),
        width: 220,
        textScale: 1.5,
      ),
    );

    expect(find.byType(Column), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('action header stacks instead of overflowing', (tester) async {
    await tester.pumpWidget(
      host(
        ResponsiveActionHeader(
          title: 'An intentionally long dashboard section heading',
          action: FilledButton(
            onPressed: () {},
            child: const Text('Create a new record'),
          ),
        ),
        width: 260,
      ),
    );

    expect(find.byType(Column), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
