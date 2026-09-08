import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:storefront/core/network/token_storage.dart';
import 'package:storefront/core/storage/guest_cart_storage.dart';
import 'package:storefront/features/cart/bloc/cart_cubit.dart';
import 'package:storefront/features/cart/bloc/cart_state.dart';
import 'package:storefront/repositories/cart_repository.dart';
import 'package:storefront/shared/models/cart_model.dart';
import 'package:storefront/shared/models/product_model.dart';

class MockCartRepository extends Mock implements CartRepository {}

class MockTokenStorage extends Mock implements TokenStorage {}

void main() {
  const variant = VariantModel(
    id: 'variant-1',
    size: 'M',
    color: 'Blue',
    price: 24.99,
    stock: 5,
    sku: 'SKU-1',
  );
  final product = ProductModel(
    id: 'product-1',
    name: 'Guest Product',
    description: 'A product saved before registration.',
    basePrice: 24.99,
    images: const ['https://example.com/product.jpg'],
    tags: const [],
    isActive: true,
    avgRating: 0,
    reviewCount: 0,
    vendorId: 'vendor-1',
    vendorName: 'Guest Vendor',
    variants: const [variant],
    createdAt: DateTime.utc(2026),
  );
  const serverCart = CartModel(
    id: 'server-cart',
    userId: 'user-1',
    items: [],
    subtotal: 0,
  );

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('guest item is persisted with enough data to render the cart', () async {
    final storage = GuestCartStorage();

    final cart = await storage.add(product, variant, 2);
    final restored = await GuestCartStorage().loadCart();

    expect(cart.itemCount, 2);
    expect(restored.items.single.productName, 'Guest Product');
    expect(restored.items.single.variantLabel, 'M / Blue');
    expect(restored.subtotal, 49.98);
  });

  test(
    'authenticated cart merge uploads and then clears guest items',
    () async {
      final repository = MockCartRepository();
      final tokens = MockTokenStorage();
      final storage = GuestCartStorage();
      await storage.add(product, variant, 2);
      when(() => tokens.hasTokens()).thenAnswer((_) async => true);
      when(
        () => repository.addItem('variant-1', 2),
      ).thenAnswer((_) async => serverCart);
      when(repository.getCart).thenAnswer((_) async => serverCart);
      final cubit = CartCubit(
        repository: repository,
        tokenStorage: tokens,
        guestStorage: storage,
      );

      await cubit.mergeGuestCart();

      verify(() => repository.addItem('variant-1', 2)).called(1);
      expect(await storage.loadItems(), isEmpty);
      expect(cubit.state, const CartLoaded(cart: serverCart));
      await cubit.close();
    },
  );
}
