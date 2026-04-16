import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:storefront/shared/models/product_model.dart';
import 'package:storefront/shared/widgets/product_card.dart';

ProductModel _makeProduct({
  String id = 'prod-1',
  String name = 'Test Product',
  double basePrice = 29.99,
  double avgRating = 4.5,
  int reviewCount = 100,
  List<String> images = const [],
  List<VariantModel> variants = const [],
}) =>
    ProductModel(
      id: id,
      name: name,
      description: 'A test product description',
      basePrice: basePrice,
      images: images,
      tags: const [],
      isActive: true,
      avgRating: avgRating,
      reviewCount: reviewCount,
      variants: variants,
      createdAt: DateTime(2024, 1, 1),
    );

void main() {
  Widget buildCard(ProductModel product, {VoidCallback? onTap}) =>
      MaterialApp(
        home: Scaffold(
          body: ProductCard(product: product, onTap: onTap),
        ),
      );

  group('ProductCard', () {
    testWidgets('renders product name', (tester) async {
      await tester.pumpWidget(buildCard(_makeProduct(name: 'Cool Sneakers')));

      expect(find.text('Cool Sneakers'), findsOneWidget);
    });

    testWidgets('renders basePrice when no variants', (tester) async {
      await tester.pumpWidget(buildCard(_makeProduct(basePrice: 49.99)));

      expect(find.text('\$49.99'), findsOneWidget);
    });

    testWidgets('renders lowest variant price as display price', (tester) async {
      final product = _makeProduct(
        basePrice: 99.99,
        variants: [
          const VariantModel(id: 'v1', price: 29.99, stock: 5, sku: 'SKU1'),
          const VariantModel(id: 'v2', price: 49.99, stock: 3, sku: 'SKU2'),
        ],
      );

      await tester.pumpWidget(buildCard(product));

      expect(find.text('\$29.99'), findsOneWidget);
    });

    testWidgets('renders rating and review count when avgRating > 0',
        (tester) async {
      await tester.pumpWidget(
          buildCard(_makeProduct(avgRating: 4.3, reviewCount: 82)));

      expect(find.text('4.3'), findsOneWidget);
      expect(find.text('(82)'), findsOneWidget);
    });

    testWidgets('renders "New" label when avgRating is 0', (tester) async {
      await tester.pumpWidget(
          buildCard(_makeProduct(avgRating: 0.0, reviewCount: 0)));

      expect(find.text('New'), findsOneWidget);
    });

    testWidgets('does not render review count when reviewCount is 0',
        (tester) async {
      await tester.pumpWidget(
          buildCard(_makeProduct(avgRating: 4.5, reviewCount: 0)));

      expect(find.text('(0)'), findsNothing);
    });

    testWidgets('calls onTap callback when tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(
          buildCard(_makeProduct(), onTap: () => tapped = true));

      await tester.tap(find.byType(ProductCard));
      expect(tapped, isTrue);
    });

    testWidgets('shows ProductPlaceholderImage when images list is empty',
        (tester) async {
      await tester.pumpWidget(buildCard(_makeProduct(images: [])));

      expect(find.byType(ProductPlaceholderImage), findsOneWidget);
    });
  });
}
