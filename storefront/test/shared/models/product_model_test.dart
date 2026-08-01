import 'package:flutter_test/flutter_test.dart';
import 'package:storefront/shared/models/product_model.dart';

void main() {
  ProductModel productWith(List<VariantModel> variants) => ProductModel(
    id: 'product-1',
    name: 'Product',
    description: 'Description',
    basePrice: 499,
    images: const [],
    tags: const [],
    isActive: true,
    avgRating: 0,
    reviewCount: 0,
    variants: variants,
    createdAt: DateTime(2026),
  );

  test('product without variants is not purchasable', () {
    expect(productWith(const []).isInStock, isFalse);
  });

  test('product with an in-stock variant is purchasable', () {
    const variant = VariantModel(
      id: 'variant-1',
      price: 499,
      stock: 1,
      sku: 'SKU-1',
    );

    expect(productWith(const [variant]).isInStock, isTrue);
  });
}
