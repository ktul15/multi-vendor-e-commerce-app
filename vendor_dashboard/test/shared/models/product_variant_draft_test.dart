import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_dashboard/shared/models/product.dart';

void main() {
  test('serializes required inventory and omits empty option dimensions', () {
    const draft = ProductVariantDraft(
      sku: 'DEFAULT-001',
      price: 499,
      stock: 12,
    );

    expect(draft.toJson(), {
      'sku': 'DEFAULT-001',
      'price': 499,
      'stock': 12,
    });
  });

  test('serializes optional size and color', () {
    const draft = ProductVariantDraft(
      sku: 'TSHIRT-BLUE-M',
      price: 599,
      stock: 8,
      size: 'M',
      color: 'Blue',
    );

    expect(draft.toJson(), containsPair('size', 'M'));
    expect(draft.toJson(), containsPair('color', 'Blue'));
  });
}
