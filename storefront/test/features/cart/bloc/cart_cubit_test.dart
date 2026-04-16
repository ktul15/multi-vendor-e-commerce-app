import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/features/cart/bloc/cart_cubit.dart';
import 'package:storefront/features/cart/bloc/cart_state.dart';
import 'package:storefront/shared/models/cart_model.dart';
import '../../../mocks.dart';

// ── Fixtures ────────────────────────────────────────────────────────────────

const _emptyCart = CartModel(
  id: 'cart-1',
  userId: 'user-1',
  items: [],
  subtotal: 0.0,
);

const _testItem = CartItemModel(
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

const _cartWithItem = CartModel(
  id: 'cart-1',
  userId: 'user-1',
  items: [_testItem],
  subtotal: 59.98,
);

const _updatedCart = CartModel(
  id: 'cart-1',
  userId: 'user-1',
  items: [
    CartItemModel(
      id: 'item-1',
      cartId: 'cart-1',
      quantity: 3,
      variantId: 'var-1',
      variantPrice: 29.99,
      variantStock: 10,
      variantSku: 'SKU-001',
      productId: 'prod-1',
      productName: 'Test Product',
      productImages: [],
    ),
  ],
  subtotal: 89.97,
);

const _testPromo = PromoPreviewModel(
  code: 'SAVE10',
  discountType: 'percentage',
  discountValue: 10.0,
  discountAmount: 6.0,
  subtotal: 59.98,
  total: 53.98,
);

void main() {
  late MockCartRepository mockRepo;

  setUp(() {
    mockRepo = MockCartRepository();
  });

  group('CartCubit', () {
    // ── loadCart ───────────────────────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'loadCart emits [CartLoading, CartLoaded] on success',
      build: () {
        when(() => mockRepo.getCart()).thenAnswer((_) async => _emptyCart);
        return CartCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.loadCart(),
      expect: () => [
        isA<CartLoading>(),
        isA<CartLoaded>().having((s) => s.cart, 'cart', _emptyCart),
      ],
      verify: (_) => verify(() => mockRepo.getCart()).called(1),
    );

    blocTest<CartCubit, CartState>(
      'loadCart emits [CartLoading, CartError] on ApiException',
      build: () {
        when(() => mockRepo.getCart())
            .thenThrow(const ApiException('Not found', statusCode: 404));
        return CartCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.loadCart(),
      expect: () => [
        isA<CartLoading>(),
        isA<CartError>().having((s) => s.message, 'message', 'Not found'),
      ],
    );

    blocTest<CartCubit, CartState>(
      'loadCart emits [CartLoading, CartError] on NetworkException',
      build: () {
        when(() => mockRepo.getCart())
            .thenThrow(const NetworkException('No internet'));
        return CartCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.loadCart(),
      expect: () => [
        isA<CartLoading>(),
        isA<CartError>().having((s) => s.message, 'message', 'No internet'),
      ],
    );

    blocTest<CartCubit, CartState>(
      'loadCart does nothing when already in CartLoading',
      build: () => CartCubit(repository: mockRepo),
      seed: () => const CartLoading(),
      act: (cubit) => cubit.loadCart(),
      expect: () => [],
      // The guard clause prevents any network call from being made.
      verify: (_) => verifyNever(() => mockRepo.getCart()),
    );

    // ── addItem ────────────────────────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'addItem emits [CartLoaded(isUpdating:true), CartLoaded] on success',
      build: () {
        when(() => mockRepo.addItem(any(), any()))
            .thenAnswer((_) async => _cartWithItem);
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _emptyCart),
      act: (cubit) => cubit.addItem('var-1', 1),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartLoaded>()
            .having((s) => s.cart, 'cart', _cartWithItem)
            .having((s) => s.isUpdating, 'isUpdating', false),
      ],
    );

    blocTest<CartCubit, CartState>(
      'addItem preserves active promo preview on success',
      build: () {
        when(() => mockRepo.addItem(any(), any()))
            .thenAnswer((_) async => _cartWithItem);
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _emptyCart, promoPreview: _testPromo),
      act: (cubit) => cubit.addItem('var-1', 1),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartLoaded>()
            .having((s) => s.promoPreview, 'promoPreview', _testPromo),
      ],
    );

    blocTest<CartCubit, CartState>(
      'addItem emits CartError with previousCart on ApiException',
      build: () {
        when(() => mockRepo.addItem(any(), any()))
            .thenThrow(const ApiException('Out of stock', statusCode: 400));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _emptyCart),
      act: (cubit) => cubit.addItem('var-1', 1),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartError>()
            .having((s) => s.message, 'message', 'Out of stock')
            .having((s) => s.previousCart, 'previousCart', _emptyCart),
      ],
    );

    // ── updateQuantity ─────────────────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'updateQuantity emits [CartLoaded(isUpdating:true), CartLoaded] on success',
      build: () {
        when(() => mockRepo.updateItem(any(), any()))
            .thenAnswer((_) async => _updatedCart);
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.updateQuantity('item-1', 3),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartLoaded>()
            .having((s) => s.cart, 'cart', _updatedCart)
            .having((s) => s.isUpdating, 'isUpdating', false),
      ],
      verify: (_) =>
          verify(() => mockRepo.updateItem('item-1', 3)).called(1),
    );

    blocTest<CartCubit, CartState>(
      'updateQuantity emits CartError with previousCart on NetworkException',
      build: () {
        when(() => mockRepo.updateItem(any(), any()))
            .thenThrow(const NetworkException('Connection failed'));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.updateQuantity('item-1', 3),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartError>()
            .having((s) => s.message, 'message', 'Connection failed')
            .having((s) => s.previousCart, 'previousCart', _cartWithItem),
      ],
    );

    // Error with active promo: CartError.previousCart carries the cart but
    // not the promo — promo state is lost on error and must be re-applied.
    blocTest<CartCubit, CartState>(
      'updateQuantity CartError.previousCart reflects cart (promo not recoverable from previousCart)',
      build: () {
        when(() => mockRepo.updateItem(any(), any()))
            .thenThrow(const ApiException('Conflict', statusCode: 409));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem, promoPreview: _testPromo),
      act: (cubit) => cubit.updateQuantity('item-1', 3),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartError>()
            .having((s) => s.previousCart, 'previousCart', _cartWithItem),
      ],
    );

    // ── removeItem ─────────────────────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'removeItem emits [CartLoaded(isUpdating:true), CartLoaded] on success',
      build: () {
        when(() => mockRepo.removeItem(any()))
            .thenAnswer((_) async => _emptyCart);
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.removeItem('item-1'),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartLoaded>()
            .having((s) => s.cart, 'cart', _emptyCart)
            .having((s) => s.isUpdating, 'isUpdating', false),
      ],
      verify: (_) => verify(() => mockRepo.removeItem('item-1')).called(1),
    );

    blocTest<CartCubit, CartState>(
      'removeItem emits CartError with previousCart on ApiException',
      build: () {
        when(() => mockRepo.removeItem(any()))
            .thenThrow(const ApiException('Not found', statusCode: 404));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.removeItem('item-1'),
      expect: () => [
        isA<CartLoaded>().having((s) => s.isUpdating, 'isUpdating', true),
        isA<CartError>()
            .having((s) => s.message, 'message', 'Not found')
            .having((s) => s.previousCart, 'previousCart', _cartWithItem),
      ],
    );

    // ── clearCart ──────────────────────────────────────────────────────────

    // clearCart emits no intermediate isUpdating state — it goes straight from
    // the current state to CartLoaded after both clearCart + getCart succeed.
    blocTest<CartCubit, CartState>(
      'clearCart emits CartLoaded with empty cart after success',
      build: () {
        when(() => mockRepo.clearCart()).thenAnswer((_) async {});
        when(() => mockRepo.getCart()).thenAnswer((_) async => _emptyCart);
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.clearCart(),
      expect: () => [
        isA<CartLoaded>().having((s) => s.cart, 'cart', _emptyCart),
      ],
      verify: (_) {
        verify(() => mockRepo.clearCart()).called(1);
        verify(() => mockRepo.getCart()).called(1);
      },
    );

    blocTest<CartCubit, CartState>(
      'clearCart emits CartError with previousCart on ApiException',
      build: () {
        when(() => mockRepo.clearCart())
            .thenThrow(const ApiException('Server error', statusCode: 500));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.clearCart(),
      expect: () => [
        isA<CartError>()
            .having((s) => s.message, 'message', 'Server error')
            .having((s) => s.previousCart, 'previousCart', _cartWithItem),
      ],
      verify: (_) => verify(() => mockRepo.clearCart()).called(1),
    );

    // ── applyPromo ─────────────────────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'applyPromo emits [CartLoaded(applying), CartLoaded(preview)] on success',
      build: () {
        when(() => mockRepo.previewPromo(any()))
            .thenAnswer((_) async => _testPromo);
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.applyPromo('SAVE10'),
      expect: () => [
        isA<CartLoaded>()
            .having((s) => s.isApplyingPromo, 'isApplyingPromo', true),
        isA<CartLoaded>()
            .having((s) => s.promoPreview, 'promoPreview', _testPromo)
            .having((s) => s.isApplyingPromo, 'isApplyingPromo', false),
      ],
      verify: (_) => verify(() => mockRepo.previewPromo('SAVE10')).called(1),
    );

    // Promo errors stay in CartLoaded — the cart is not lost when a promo fails.
    blocTest<CartCubit, CartState>(
      'applyPromo stays in CartLoaded with promoError (no CartError) on ApiException',
      build: () {
        when(() => mockRepo.previewPromo(any()))
            .thenThrow(const ApiException('Invalid promo code', statusCode: 422));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.applyPromo('BADCODE'),
      expect: () => [
        isA<CartLoaded>()
            .having((s) => s.isApplyingPromo, 'isApplyingPromo', true),
        isA<CartLoaded>()
            .having((s) => s.promoError, 'promoError', 'Invalid promo code')
            .having((s) => s.isApplyingPromo, 'isApplyingPromo', false),
      ],
    );

    // NetworkException also stays in CartLoaded (separate catch branch from ApiException).
    blocTest<CartCubit, CartState>(
      'applyPromo stays in CartLoaded with promoError (no CartError) on NetworkException',
      build: () {
        when(() => mockRepo.previewPromo(any()))
            .thenThrow(const NetworkException('No internet'));
        return CartCubit(repository: mockRepo);
      },
      seed: () => const CartLoaded(cart: _cartWithItem),
      act: (cubit) => cubit.applyPromo('SAVE10'),
      expect: () => [
        isA<CartLoaded>()
            .having((s) => s.isApplyingPromo, 'isApplyingPromo', true),
        isA<CartLoaded>()
            .having((s) => s.promoError, 'promoError', 'No internet')
            .having((s) => s.isApplyingPromo, 'isApplyingPromo', false),
      ],
    );

    blocTest<CartCubit, CartState>(
      'applyPromo does nothing when state is not CartLoaded',
      build: () => CartCubit(repository: mockRepo),
      act: (cubit) => cubit.applyPromo('SAVE10'),
      expect: () => [],
    );

    // ── clearPromo ─────────────────────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'clearPromo clears both promoPreview and promoError',
      build: () => CartCubit(repository: mockRepo),
      seed: () => const CartLoaded(
        cart: _cartWithItem,
        promoPreview: _testPromo,
        promoError: 'stale error',
      ),
      act: (cubit) => cubit.clearPromo(),
      expect: () => [
        isA<CartLoaded>()
            .having((s) => s.promoPreview, 'promoPreview', isNull)
            .having((s) => s.promoError, 'promoError', isNull),
      ],
    );

    blocTest<CartCubit, CartState>(
      'clearPromo does nothing when state is not CartLoaded',
      build: () => CartCubit(repository: mockRepo),
      act: (cubit) => cubit.clearPromo(),
      expect: () => [],
    );

    // ── guard: mutation methods when state is not CartLoaded ───────────────

    // _currentCart returns null when state is not CartLoaded; previousCart on
    // any resulting CartError must be null rather than a stale cart reference.
    blocTest<CartCubit, CartState>(
      'addItem emits CartError with null previousCart when state is not CartLoaded',
      build: () {
        when(() => mockRepo.addItem(any(), any()))
            .thenThrow(const ApiException('error', statusCode: 500));
        return CartCubit(repository: mockRepo);
      },
      // default initial state is CartInitial — not CartLoaded
      act: (cubit) => cubit.addItem('var-1', 1),
      expect: () => [
        isA<CartError>().having((s) => s.previousCart, 'previousCart', isNull),
      ],
    );

    // ── generic exception fallback ─────────────────────────────────────────

    blocTest<CartCubit, CartState>(
      'loadCart emits CartError via generic catch for non-ApiException errors',
      build: () {
        when(() => mockRepo.getCart())
            .thenThrow(Exception('unexpected error'));
        return CartCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.loadCart(),
      expect: () => [
        isA<CartLoading>(),
        isA<CartError>().having(
          (s) => s.message,
          'message',
          contains('unexpected error'),
        ),
      ],
    );
  });
}
