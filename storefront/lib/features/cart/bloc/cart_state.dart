import 'package:equatable/equatable.dart';
import '../../../shared/models/cart_model.dart';

sealed class CartState extends Equatable {
  const CartState();
}

class CartInitial extends CartState {
  const CartInitial();

  @override
  List<Object?> get props => [];
}

class CartLoading extends CartState {
  const CartLoading();

  @override
  List<Object?> get props => [];
}

class CartLoaded extends CartState {
  final CartModel cart;
  final PromoPreviewModel? promoPreview;
  final bool isUpdating;
  final bool isApplyingPromo;
  final String? promoError;

  const CartLoaded({
    required this.cart,
    this.promoPreview,
    this.isUpdating = false,
    this.isApplyingPromo = false,
    this.promoError,
  });

  // Uses the server-rounded total so display matches what the backend will charge.
  double get effectiveTotal =>
      promoPreview != null ? promoPreview!.total : cart.subtotal;

  CartLoaded copyWith({
    CartModel? cart,
    PromoPreviewModel? promoPreview,
    bool clearPromo = false,
    bool? isUpdating,
    bool? isApplyingPromo,
    String? promoError,
    bool clearPromoError = false,
  }) {
    return CartLoaded(
      cart: cart ?? this.cart,
      promoPreview: clearPromo ? null : (promoPreview ?? this.promoPreview),
      isUpdating: isUpdating ?? this.isUpdating,
      isApplyingPromo: isApplyingPromo ?? this.isApplyingPromo,
      promoError: clearPromoError ? null : (promoError ?? this.promoError),
    );
  }

  @override
  List<Object?> get props =>
      [cart, promoPreview, isUpdating, isApplyingPromo, promoError];
}

class CartError extends CartState {
  final String message;
  final CartModel? previousCart;

  const CartError({required this.message, this.previousCart});

  @override
  List<Object?> get props => [message, previousCart];
}
