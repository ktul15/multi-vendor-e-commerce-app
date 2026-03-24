import 'dart:async';

import 'package:collection/collection.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_stripe/flutter_stripe.dart' show StripeException, FailureCode;
import '../../../core/config/app_env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/stripe/stripe_service.dart';
import '../../../features/cart/bloc/cart_cubit.dart';
import '../../../features/cart/bloc/cart_state.dart';
import '../../../repositories/address_repository.dart';
import '../../../repositories/order_repository.dart';
import '../../../shared/models/address_model.dart';
import 'checkout_event.dart';
import 'checkout_state.dart';

class CheckoutBloc extends Bloc<CheckoutEvent, CheckoutState> {
  final AddressRepository _addressRepository;
  final OrderRepository _orderRepository;
  final StripeService _stripeService;
  final CartCubit _cartCubit;

  /// Cached address list so back-navigation (summary → address) avoids a
  /// redundant network fetch.
  List<AddressModel> _cachedAddresses = [];

  CheckoutBloc({
    required AddressRepository addressRepository,
    required OrderRepository orderRepository,
    required StripeService stripeService,
    required CartCubit cartCubit,
  })  : _addressRepository = addressRepository,
        _orderRepository = orderRepository,
        _stripeService = stripeService,
        _cartCubit = cartCubit,
        super(const CheckoutAddressesLoading()) {
    on<CheckoutStarted>(_onStarted);
    on<CheckoutAddressSelected>(_onAddressSelected);
    on<CheckoutAddressAdded>(_onAddressAdded);
    on<CheckoutProceedToSummary>(_onProceedToSummary);
    on<CheckoutBackToAddress>(_onBackToAddress);
    on<CheckoutProceedToPayment>(_onProceedToPayment);
    on<CheckoutRetried>(_onRetried);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  Future<void> _onStarted(
    CheckoutStarted event,
    Emitter<CheckoutState> emit,
  ) async {
    await _loadAddresses(emit);
  }

  void _onAddressSelected(
    CheckoutAddressSelected event,
    Emitter<CheckoutState> emit,
  ) {
    final current = state;
    if (current is! CheckoutAddressStep) return;
    emit(current.copyWith(selectedAddress: event.address, clearError: true));
  }

  Future<void> _onAddressAdded(
    CheckoutAddressAdded event,
    Emitter<CheckoutState> emit,
  ) async {
    final current = state;
    if (current is! CheckoutAddressStep) return;
    emit(current.copyWith(isAddingAddress: true, clearError: true));
    try {
      final newAddress = await _addressRepository.createAddress(
        fullName: event.fullName,
        phone: event.phone,
        street: event.street,
        city: event.city,
        state: event.state,
        country: event.country,
        zipCode: event.zipCode,
      );
      final updated = [...current.addresses, newAddress];
      _cachedAddresses = updated;
      emit(CheckoutAddressStep(
        addresses: updated,
        selectedAddress: newAddress,
        isAddingAddress: false,
      ));
    } on ApiException catch (e) {
      emit(current.copyWith(isAddingAddress: false, error: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isAddingAddress: false, error: e.message));
    } catch (e) {
      emit(current.copyWith(isAddingAddress: false, error: e.toString()));
    }
  }

  void _onProceedToSummary(
    CheckoutProceedToSummary event,
    Emitter<CheckoutState> emit,
  ) {
    final current = state;
    if (current is! CheckoutAddressStep) return;
    final selectedAddress = current.selectedAddress;
    if (selectedAddress == null) return;

    final cartState = _cartCubit.state;
    if (cartState is! CartLoaded) return;

    emit(CheckoutSummaryStep(
      selectedAddress: selectedAddress,
      cart: cartState.cart,
      promoPreview: cartState.promoPreview,
    ));
  }

  void _onBackToAddress(
    CheckoutBackToAddress event,
    Emitter<CheckoutState> emit,
  ) {
    final current = state;
    // Extract selectedAddress from either SummaryStep or PaymentInProgress
    // so the selection is preserved on back-navigation from either state.
    AddressModel? selectedAddress;
    if (current is CheckoutSummaryStep) {
      selectedAddress = current.selectedAddress;
    } else if (current is CheckoutPaymentInProgress) {
      selectedAddress = current.selectedAddress;
    }
    // Restore from cache — no network call needed.
    emit(CheckoutAddressStep(
      addresses: _cachedAddresses,
      selectedAddress: selectedAddress,
    ));
  }

  Future<void> _onProceedToPayment(
    CheckoutProceedToPayment event,
    Emitter<CheckoutState> emit,
  ) async {
    final current = state;
    if (current is! CheckoutSummaryStep) return;

    emit(CheckoutPaymentInProgress(summary: current));

    // Reuse a previously created order if retrying after a payment failure,
    // so we never create duplicate orders for the same purchase attempt.
    final pendingOrder = current.pendingOrder;

    try {
      final order = pendingOrder ??
          await _orderRepository.createOrder(
            addressId: current.selectedAddress.id,
            promoCode: current.promoPreview?.code,
          );

      try {
        // 2. Create Stripe PaymentIntent.
        final clientSecret = await _orderRepository.createPaymentIntent(
          orderId: order.id,
        );

        // 3. Init and present the Payment Sheet.
        await _stripeService.initPaymentSheet(
          clientSecret: clientSecret,
          merchantDisplayName: AppEnv.appName,
        );
        await _stripeService.presentPaymentSheet();

        // 4. Payment confirmed — refresh cart (fire-and-forget so a cart
        //    reload failure does not block the success screen).
        unawaited(_cartCubit.loadCart().catchError((_) {}));
        emit(CheckoutSuccess(order: order));
      } on StripeException catch (e) {
        if (e.error.code == FailureCode.Canceled) {
          // User dismissed the sheet — return to summary preserving the
          // pending order so a second tap does not create a duplicate.
          emit(current.copyWith(pendingOrder: order));
        } else {
          emit(CheckoutError(
            message: e.error.localizedMessage ??
                'Payment failed. Please try again.',
            lastStep: CheckoutStep.payment,
            previousSummaryStep: current,
            failedOrder: order,
          ));
        }
      } on ApiException catch (e) {
        emit(CheckoutError(
          message: e.message,
          lastStep: CheckoutStep.payment,
          previousSummaryStep: current,
          failedOrder: order,
        ));
      } on NetworkException catch (e) {
        emit(CheckoutError(
          message: e.message,
          lastStep: CheckoutStep.payment,
          previousSummaryStep: current,
          failedOrder: order,
        ));
      } catch (e) {
        emit(CheckoutError(
          message: e.toString(),
          lastStep: CheckoutStep.payment,
          previousSummaryStep: current,
          failedOrder: order,
        ));
      }
    } on ApiException catch (e) {
      // createOrder itself failed — no order was created.
      emit(CheckoutError(
        message: e.message,
        lastStep: CheckoutStep.payment,
        previousSummaryStep: current,
      ));
    } on NetworkException catch (e) {
      emit(CheckoutError(
        message: e.message,
        lastStep: CheckoutStep.payment,
        previousSummaryStep: current,
      ));
    } catch (e) {
      emit(CheckoutError(
        message: e.toString(),
        lastStep: CheckoutStep.payment,
        previousSummaryStep: current,
      ));
    }
  }

  Future<void> _onRetried(
    CheckoutRetried event,
    Emitter<CheckoutState> emit,
  ) async {
    final current = state;
    if (current is! CheckoutError) return;

    if (current.lastStep == CheckoutStep.payment &&
        current.previousSummaryStep != null) {
      final summary = current.previousSummaryStep!;
      // Thread the failed order into the summary step so the next
      // CheckoutProceedToPayment reuses it instead of calling createOrder.
      emit(CheckoutSummaryStep(
        selectedAddress: summary.selectedAddress,
        cart: summary.cart,
        promoPreview: summary.promoPreview,
        pendingOrder: current.failedOrder,
      ));
    } else {
      // Address-step errors: reload from network.
      await _loadAddresses(emit);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Future<void> _loadAddresses(Emitter<CheckoutState> emit) async {
    emit(const CheckoutAddressesLoading());
    try {
      final addresses = await _addressRepository.getAddresses();
      _cachedAddresses = addresses;
      emit(CheckoutAddressStep(
        addresses: addresses,
        selectedAddress: _selectInitialAddress(addresses),
      ));
    } on ApiException catch (e) {
      emit(CheckoutError(message: e.message, lastStep: CheckoutStep.address));
    } on NetworkException catch (e) {
      emit(CheckoutError(message: e.message, lastStep: CheckoutStep.address));
    } catch (e) {
      emit(
          CheckoutError(message: e.toString(), lastStep: CheckoutStep.address));
    }
  }

  /// Picks the default address, falling back to the first address in the list.
  /// Returns null when the list is empty.
  AddressModel? _selectInitialAddress(List<AddressModel> addresses) {
    if (addresses.isEmpty) return null;
    return addresses.firstWhereOrNull((a) => a.isDefault) ?? addresses.first;
  }
}
