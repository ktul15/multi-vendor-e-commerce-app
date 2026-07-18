import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/token_storage.dart';
import '../../../core/storage/guest_cart_storage.dart';
import '../../../repositories/cart_repository.dart';
import '../../../shared/models/cart_model.dart';
import '../../../shared/models/product_model.dart';
import 'cart_state.dart';

class CartCubit extends Cubit<CartState> {
  final CartRepository _repository;
  final TokenStorage? _tokenStorage;
  final GuestCartStorage? _guestStorage;

  CartCubit({
    required CartRepository repository,
    TokenStorage? tokenStorage,
    GuestCartStorage? guestStorage,
  }) : _repository = repository,
       _tokenStorage = tokenStorage,
       _guestStorage = guestStorage,
       super(const CartInitial());

  Future<bool> get _isAuthenticated async =>
      _tokenStorage == null || await _tokenStorage.hasTokens();

  Future<void> loadCart() async {
    if (state is CartLoading) return;
    emit(const CartLoading());
    try {
      final authenticated = await _isAuthenticated;
      final cart = authenticated
          ? await _repository.getCart()
          : await _guestStorage!.loadCart();
      emit(CartLoaded(cart: cart));
    } on ApiException catch (e) {
      emit(CartError(message: e.message));
    } on NetworkException catch (e) {
      emit(CartError(message: e.message));
    } catch (e) {
      emit(CartError(message: e.toString()));
    }
  }

  Future<void> addItem(
    String variantId,
    int quantity, {
    ProductModel? product,
    VariantModel? variant,
  }) async {
    final current = state;
    final currentCart = _currentCart;
    if (current is CartLoaded) {
      emit(current.copyWith(isUpdating: true));
    }
    try {
      final authenticated = await _isAuthenticated;
      if (!authenticated && (product == null || variant == null)) {
        throw const ApiException(
          'Product details are required for a guest cart',
        );
      }
      final cart = authenticated
          ? await _repository.addItem(variantId, quantity)
          : await _guestStorage!.add(product!, variant!, quantity);
      // Preserve any active promo preview after adding an item.
      final promo = current is CartLoaded ? current.promoPreview : null;
      emit(CartLoaded(cart: cart, promoPreview: promo));
    } on ApiException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } on NetworkException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } catch (e) {
      emit(CartError(message: e.toString(), previousCart: currentCart));
    }
  }

  Future<void> updateQuantity(String itemId, int quantity) async {
    final current = state;
    final currentCart = _currentCart;
    if (current is CartLoaded) {
      emit(current.copyWith(isUpdating: true));
    }
    try {
      final authenticated = await _isAuthenticated;
      final cart = authenticated
          ? await _repository.updateItem(itemId, quantity)
          : await _guestStorage!.update(itemId, quantity);
      final promo = current is CartLoaded ? current.promoPreview : null;
      emit(CartLoaded(cart: cart, promoPreview: promo));
    } on ApiException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } on NetworkException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } catch (e) {
      emit(CartError(message: e.toString(), previousCart: currentCart));
    }
  }

  Future<void> removeItem(String itemId) async {
    final current = state;
    final currentCart = _currentCart;
    if (current is CartLoaded) {
      emit(current.copyWith(isUpdating: true));
    }
    try {
      final authenticated = await _isAuthenticated;
      final cart = authenticated
          ? await _repository.removeItem(itemId)
          : await _guestStorage!.remove(itemId);
      final promo = current is CartLoaded ? current.promoPreview : null;
      emit(CartLoaded(cart: cart, promoPreview: promo));
    } on ApiException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } on NetworkException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } catch (e) {
      emit(CartError(message: e.toString(), previousCart: currentCart));
    }
  }

  Future<void> clearCart() async {
    final currentCart = _currentCart;
    try {
      final authenticated = await _isAuthenticated;
      if (authenticated) {
        await _repository.clearCart();
      } else {
        await _guestStorage!.clear();
      }
      final cart = authenticated
          ? await _repository.getCart()
          : await _guestStorage!.loadCart();
      emit(CartLoaded(cart: cart));
    } on ApiException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } on NetworkException catch (e) {
      emit(CartError(message: e.message, previousCart: currentCart));
    } catch (e) {
      emit(CartError(message: e.toString(), previousCart: currentCart));
    }
  }

  Future<void> applyPromo(String code) async {
    final current = state;
    if (current is! CartLoaded) return;
    // Clear any previous promo error and show the loading spinner.
    emit(current.copyWith(isApplyingPromo: true, clearPromoError: true));
    try {
      final preview = await _repository.previewPromo(code);
      emit(
        current.copyWith(
          promoPreview: preview,
          isApplyingPromo: false,
          clearPromoError: true,
        ),
      );
    } on ApiException catch (e) {
      // Promo failure ≠ cart failure — stay in CartLoaded with an inline error.
      emit(current.copyWith(isApplyingPromo: false, promoError: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isApplyingPromo: false, promoError: e.message));
    } catch (e) {
      emit(current.copyWith(isApplyingPromo: false, promoError: e.toString()));
    }
  }

  void clearPromo() {
    final current = state;
    if (current is! CartLoaded) return;
    emit(current.copyWith(clearPromo: true, clearPromoError: true));
  }

  Future<void> mergeGuestCart() async {
    if (_guestStorage == null || !await _isAuthenticated) return;
    final items = await _guestStorage.loadItems();
    for (final item in items) {
      await _repository.addItem(item.variantId, item.quantity);
      await _guestStorage.remove(item.variantId);
    }
    emit(CartLoaded(cart: await _repository.getCart()));
  }

  void reset() => emit(const CartInitial());

  CartModel? get _currentCart {
    final s = state;
    if (s is CartLoaded) return s.cart;
    if (s is CartError) return s.previousCart;
    return null;
  }
}
