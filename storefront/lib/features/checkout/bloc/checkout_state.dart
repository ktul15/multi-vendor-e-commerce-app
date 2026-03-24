import 'package:equatable/equatable.dart';
import '../../../shared/models/address_model.dart';
import '../../../shared/models/cart_model.dart';
import '../../../shared/models/order_model.dart';

enum CheckoutStep { address, summary, payment }

sealed class CheckoutState extends Equatable {
  const CheckoutState();

  @override
  List<Object?> get props => [];
}

/// Initial state before any addresses are loaded.
class CheckoutAddressesLoading extends CheckoutState {
  const CheckoutAddressesLoading();
}

/// Sentinel used by [CheckoutAddressStep.copyWith] so callers can explicitly
/// clear [selectedAddress] back to null without ambiguity.
const _kUnset = Object();

/// Step 1 — address selection.
class CheckoutAddressStep extends CheckoutState {
  final List<AddressModel> addresses;
  final AddressModel? selectedAddress;

  /// True while a POST /addresses call is in-flight.
  final bool isAddingAddress;

  /// Inline error shown when address creation fails.
  final String? error;

  const CheckoutAddressStep({
    required this.addresses,
    this.selectedAddress,
    this.isAddingAddress = false,
    this.error,
  });

  /// Pass `selectedAddress: null` explicitly to clear the selection.
  /// Omit the parameter to keep the current value.
  CheckoutAddressStep copyWith({
    List<AddressModel>? addresses,
    Object? selectedAddress = _kUnset,
    bool? isAddingAddress,
    String? error,
    bool clearError = false,
  }) {
    return CheckoutAddressStep(
      addresses: addresses ?? this.addresses,
      selectedAddress: identical(selectedAddress, _kUnset)
          ? this.selectedAddress
          : selectedAddress as AddressModel?,
      isAddingAddress: isAddingAddress ?? this.isAddingAddress,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props =>
      [addresses, selectedAddress, isAddingAddress, error];
}

/// Step 2 — order summary.
class CheckoutSummaryStep extends CheckoutState {
  final AddressModel selectedAddress;
  final CartModel cart;
  final PromoPreviewModel? promoPreview;

  /// When non-null, [CheckoutBloc._onProceedToPayment] reuses this order
  /// instead of calling createOrder again, preventing duplicate orders on
  /// payment retry.
  final OrderModel? pendingOrder;

  const CheckoutSummaryStep({
    required this.selectedAddress,
    required this.cart,
    this.promoPreview,
    this.pendingOrder,
  });

  CheckoutSummaryStep copyWith({
    AddressModel? selectedAddress,
    CartModel? cart,
    Object? promoPreview = _kUnset,
    Object? pendingOrder = _kUnset,
  }) {
    return CheckoutSummaryStep(
      selectedAddress: selectedAddress ?? this.selectedAddress,
      cart: cart ?? this.cart,
      promoPreview: identical(promoPreview, _kUnset)
          ? this.promoPreview
          : promoPreview as PromoPreviewModel?,
      pendingOrder: identical(pendingOrder, _kUnset)
          ? this.pendingOrder
          : pendingOrder as OrderModel?,
    );
  }

  @override
  List<Object?> get props =>
      [selectedAddress, cart, promoPreview, pendingOrder];
}

/// Step 3 — order placed, payment intent created, Payment Sheet is shown.
/// Holds a reference to the originating [CheckoutSummaryStep] to avoid
/// duplicating [selectedAddress], [cart], and [promoPreview] fields.
class CheckoutPaymentInProgress extends CheckoutState {
  final CheckoutSummaryStep summary;

  const CheckoutPaymentInProgress({required this.summary});

  AddressModel get selectedAddress => summary.selectedAddress;
  CartModel get cart => summary.cart;
  PromoPreviewModel? get promoPreview => summary.promoPreview;

  @override
  List<Object?> get props => [summary];
}

/// Terminal success state.
class CheckoutSuccess extends CheckoutState {
  final OrderModel order;

  const CheckoutSuccess({required this.order});

  @override
  List<Object?> get props => [order];
}

/// Error state — retrying re-enters the appropriate step.
class CheckoutError extends CheckoutState {
  final String message;
  final CheckoutStep lastStep;

  /// Preserved for retry: re-emit summary step without re-fetching.
  final CheckoutSummaryStep? previousSummaryStep;

  /// If set, retry should call createPaymentIntent on this existing order
  /// instead of creating a new one (avoids duplicate orders on payment retry).
  final OrderModel? failedOrder;

  const CheckoutError({
    required this.message,
    required this.lastStep,
    this.previousSummaryStep,
    this.failedOrder,
  });

  /// Convenience accessor — the failed order's id, or null if no order was
  /// created before the failure.
  String? get failedOrderId => failedOrder?.id;

  @override
  List<Object?> get props =>
      [message, lastStep, previousSummaryStep, failedOrder];
}
