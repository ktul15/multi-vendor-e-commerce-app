import 'package:flutter_test/flutter_test.dart';
import 'package:vendor_dashboard/shared/models/product_category.dart';

void main() {
  test('flattenCategoryOptions preserves hierarchy metadata', () {
    const categories = [
      ProductCategory(
        id: 'electronics',
        name: 'Electronics',
        slug: 'electronics',
        children: [
          ProductCategory(
            id: 'phones',
            name: 'Phones',
            slug: 'phones',
            children: [
              ProductCategory(
                id: 'smartphones',
                name: 'Smartphones',
                slug: 'smartphones',
                children: [],
              ),
            ],
          ),
        ],
      ),
    ];

    final options = flattenCategoryOptions(categories);

    expect(options.map((option) => option.name), [
      'Electronics',
      'Phones',
      'Smartphones',
    ]);
    expect(options.map((option) => option.depth), [0, 1, 2]);
    expect(options.map((option) => option.hasChildren), [true, true, false]);
    expect(options.last.label, 'Electronics / Phones / Smartphones');
  });
}
