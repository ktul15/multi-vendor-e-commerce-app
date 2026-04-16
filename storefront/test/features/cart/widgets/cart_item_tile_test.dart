import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/features/cart/bloc/cart_cubit.dart';
import 'package:storefront/features/cart/widgets/cart_item_tile.dart';
import 'package:storefront/shared/models/cart_model.dart';
import '../../../mocks.dart';

const _item = CartItemModel(
  id: 'item-1',
  cartId: 'cart-1',
  quantity: 2,
  variantId: 'var-1',
  variantPrice: 29.99,
  variantStock: 10,
  variantSku: 'SKU-001',
  productId: 'prod-1',
  productName: 'Test Product',
  productImages: [],
);

const _singleItem = CartItemModel(
  id: 'item-1',
  cartId: 'cart-1',
  quantity: 1,
  variantId: 'var-1',
  variantPrice: 15.00,
  variantStock: 5,
  variantSku: 'SKU-001',
  productId: 'prod-1',
  productName: 'Single Item',
  productImages: [],
);

const _itemWithVariant = CartItemModel(
  id: 'item-2',
  cartId: 'cart-1',
  quantity: 1,
  variantId: 'var-2',
  variantPrice: 49.99,
  variantStock: 3,
  variantSku: 'SKU-002',
  productId: 'prod-2',
  productName: 'Variant Product',
  productImages: [],
  variantSize: 'M',
  variantColor: 'Blue',
);

void main() {
  late MockCartCubit mockCartCubit;

  setUp(() {
    mockCartCubit = MockCartCubit();
    when(() => mockCartCubit.updateQuantity(any(), any()))
        .thenAnswer((_) async {});
    when(() => mockCartCubit.removeItem(any())).thenAnswer((_) async {});
  });

  Widget buildTile(CartItemModel item, {bool isUpdating = false}) =>
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<CartCubit>.value(
            value: mockCartCubit,
            child: CartItemTile(item: item, isUpdating: isUpdating),
          ),
        ),
      );

  group('CartItemTile', () {
    testWidgets('renders product name', (tester) async {
      await tester.pumpWidget(buildTile(_item));

      expect(find.text('Test Product'), findsOneWidget);
    });

    testWidgets('renders price formatted with dollar sign', (tester) async {
      await tester.pumpWidget(buildTile(_item));

      expect(find.text('\$29.99'), findsOneWidget);
    });

    testWidgets('renders quantity', (tester) async {
      await tester.pumpWidget(buildTile(_item));

      expect(find.text('2'), findsOneWidget);
    });

    testWidgets('renders "Default" variant label when no size or color',
        (tester) async {
      await tester.pumpWidget(buildTile(_item));

      expect(find.text('Default'), findsOneWidget);
    });

    testWidgets('renders size/color variant label', (tester) async {
      await tester.pumpWidget(buildTile(_itemWithVariant));

      expect(find.text('M / Blue'), findsOneWidget);
    });

    testWidgets('tapping + calls updateQuantity with qty+1', (tester) async {
      await tester.pumpWidget(buildTile(_item));

      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();

      verify(() => mockCartCubit.updateQuantity('item-1', 3)).called(1);
    });

    testWidgets('tapping - calls updateQuantity with qty-1 when qty >= 2',
        (tester) async {
      await tester.pumpWidget(buildTile(_item));

      await tester.tap(find.byIcon(Icons.remove));
      await tester.pump();

      verify(() => mockCartCubit.updateQuantity('item-1', 1)).called(1);
    });

    testWidgets('tapping - does nothing when quantity is 1', (tester) async {
      await tester.pumpWidget(buildTile(_singleItem));

      await tester.tap(find.byIcon(Icons.remove));
      await tester.pump();

      verifyNever(() => mockCartCubit.updateQuantity(any(), any()));
    });

    testWidgets('quantity controls do nothing when isUpdating is true',
        (tester) async {
      await tester.pumpWidget(buildTile(_item, isUpdating: true));

      await tester.tap(find.byIcon(Icons.add));
      await tester.tap(find.byIcon(Icons.remove));
      await tester.pump();

      verifyNever(() => mockCartCubit.updateQuantity(any(), any()));
    });

    testWidgets('+ button is disabled when quantity equals variantStock',
        (tester) async {
      const maxStockItem = CartItemModel(
        id: 'item-max',
        cartId: 'cart-1',
        quantity: 5,
        variantId: 'var-1',
        variantPrice: 10.0,
        variantStock: 5, // qty == stock → + disabled
        variantSku: 'SKU',
        productId: 'prod-1',
        productName: 'Max Stock Item',
        productImages: [],
      );

      await tester.pumpWidget(buildTile(maxStockItem));

      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();

      verifyNever(() => mockCartCubit.updateQuantity(any(), any()));
    });

    testWidgets('swipe to delete calls removeItem', (tester) async {
      await tester.pumpWidget(buildTile(_item));

      // Fling from right to left (endToStart) past the dismiss threshold.
      await tester.fling(
        find.byKey(const ValueKey('item-1')),
        const Offset(-500.0, 0.0),
        1000.0,
      );
      // pumpAndSettle drives all animations (swipe-out + resize) to completion
      // without relying on hardcoded durations that could break across SDK upgrades.
      await tester.pumpAndSettle();

      // The isolated parent doesn't rebuild to remove the dismissed widget;
      // clear any resulting "widget still in tree" assertion before verifying.
      tester.takeException();

      verify(() => mockCartCubit.removeItem('item-1')).called(1);
    });
  });
}
