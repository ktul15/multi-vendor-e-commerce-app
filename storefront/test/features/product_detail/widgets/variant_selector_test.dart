import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:storefront/features/product_detail/widgets/variant_selector.dart';
import 'package:storefront/shared/models/product_model.dart';

void main() {
  Widget buildSubject({
    required List<VariantModel> variants,
    required ValueChanged<VariantModel?> onSelect,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: VariantSelector(variants: variants, onSelect: onSelect),
      ),
    );
  }

  testWidgets('allows either option of an in-stock size and color variant', (
    tester,
  ) async {
    const variant = VariantModel(
      id: 'variant-1',
      size: 'M',
      color: 'Blue',
      price: 499,
      stock: 10,
      sku: 'M-BLUE',
    );
    VariantModel? selected;

    await tester.pumpWidget(
      buildSubject(
        variants: const [variant],
        onSelect: (value) => selected = value,
      ),
    );

    await tester.tap(find.text('M'));
    await tester.pump();

    expect(selected, variant);
  });

  testWidgets('selects a color-only variant in a mixed variant list', (
    tester,
  ) async {
    const colorOnly = VariantModel(
      id: 'variant-blue',
      color: 'Blue',
      price: 499,
      stock: 10,
      sku: 'BLUE',
    );
    const sized = VariantModel(
      id: 'variant-red-large',
      size: 'L',
      color: 'Red',
      price: 549,
      stock: 0,
      sku: 'L-RED',
    );
    VariantModel? selected;

    await tester.pumpWidget(
      buildSubject(
        variants: const [colorOnly, sized],
        onSelect: (value) => selected = value,
      ),
    );

    await tester.tap(find.text('Blue'));
    await tester.pump();

    expect(selected, colorOnly);
  });
}
