import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_stripe/flutter_stripe.dart' show StripeException, FailureCode, LocalizedErrorMessage;
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:storefront/core/network/api_exception.dart';
import 'package:storefront/features/cart/bloc/cart_state.dart';
import 'package:storefront/features/checkout/bloc/checkout_bloc.dart';
import 'package:storefront/features/checkout/bloc/checkout_event.dart';
import 'package:storefront/features/checkout/bloc/checkout_state.dart';
import 'package:storefront/shared/models/cart_model.dart';
import 'package:storefront/shared/models/address_model.dart';
import 'package:storefront/shared/models/order_model.dart';
import '../../../mocks.dart';

// ── Test fixtures ────────────────────────────────────────────────────────────

final _defaultAddress = AddressModel(
  id: 'addr-default',
  userId: 'user-1',
  fullName: 'Jane Doe',
  phone: '1234567890',
  street: '1 Main St',
  city: 'Springfield',
  state: 'IL',
  country: 'US',
  zipCode: '62701',
  isDefault: true,
);

final _secondAddress = AddressModel(
  id: 'addr-2',
  userId: 'user-1',
  fullName: 'John Doe',
  phone: '0987654321',
  street: '2 Oak Ave',
  city: 'Shelbyville',
  state: 'IL',
  country: 'US',
  zipCode: '62565',
  isDefault: false,
);

final _cart = CartModel(
  id: 'cart-1',
  userId: 'user-1',
  items: [],
  subtotal: 49.99,
);

final _order = OrderModel(
  id: 'order-1',
  orderNumber: 'ORD-20260323-ABCD1234',
  subtotal: 49.99,
  discount: 0,
  tax: 0,
  total: 49.99,
  createdAt: DateTime(2026, 3, 23),
);

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  late MockAddressRepository addressRepo;
  late MockOrderRepository orderRepo;
  late MockStripeService stripeService;
  late MockCartCubit cartCubit;

  setUp(() {
    addressRepo = MockAddressRepository();
    orderRepo = MockOrderRepository();
    stripeService = MockStripeService();
    cartCubit = MockCartCubit();
  });

  CheckoutBloc buildBloc() => CheckoutBloc(
        addressRepository: addressRepo,
        orderRepository: orderRepo,
        stripeService: stripeService,
        cartCubit: cartCubit,
      );

  group('CheckoutBloc', () {
    // ── CheckoutStarted ──────────────────────────────────────────────────────

    group('CheckoutStarted', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'emits [AddressesLoading, AddressStep] with auto-selected default address',
        setUp: () {
          when(() => addressRepo.getAddresses()).thenAnswer(
            (_) async => [_defaultAddress, _secondAddress],
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutStarted()),
        expect: () => [
          const CheckoutAddressesLoading(),
          CheckoutAddressStep(
            addresses: [_defaultAddress, _secondAddress],
            selectedAddress: _defaultAddress,
          ),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'selects first address when no default exists',
        setUp: () {
          final noDefault = _defaultAddress.copyWith(isDefault: false);
          when(() => addressRepo.getAddresses()).thenAnswer(
            (_) async => [noDefault, _secondAddress],
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutStarted()),
        expect: () => [
          const CheckoutAddressesLoading(),
          isA<CheckoutAddressStep>().having(
            (s) => s.selectedAddress?.id,
            'selectedAddress.id',
            _defaultAddress.id,
          ),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'emits [AddressesLoading, CheckoutError] on API error',
        setUp: () {
          when(() => addressRepo.getAddresses()).thenThrow(
            const ApiException('Server error'),
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutStarted()),
        expect: () => [
          const CheckoutAddressesLoading(),
          isA<CheckoutError>().having(
            (e) => e.lastStep,
            'lastStep',
            CheckoutStep.address,
          ),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'emits [AddressesLoading, AddressStep(no selection)] when list is empty',
        setUp: () {
          when(() => addressRepo.getAddresses()).thenAnswer(
            (_) async => [],
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutStarted()),
        expect: () => [
          const CheckoutAddressesLoading(),
          const CheckoutAddressStep(addresses: [], selectedAddress: null),
        ],
      );
    });

    // ── CheckoutAddressSelected ──────────────────────────────────────────────

    group('CheckoutAddressSelected', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'updates selectedAddress within AddressStep',
        seed: () => CheckoutAddressStep(
          addresses: [_defaultAddress, _secondAddress],
          selectedAddress: _defaultAddress,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(CheckoutAddressSelected(_secondAddress)),
        expect: () => [
          CheckoutAddressStep(
            addresses: [_defaultAddress, _secondAddress],
            selectedAddress: _secondAddress,
          ),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'does nothing when not in AddressStep',
        seed: () => const CheckoutAddressesLoading(),
        build: buildBloc,
        act: (bloc) => bloc.add(CheckoutAddressSelected(_defaultAddress)),
        expect: () => [],
      );
    });

    // ── CheckoutAddressAdded ─────────────────────────────────────────────────

    group('CheckoutAddressAdded', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'appends new address and selects it on success',
        setUp: () {
          when(() => addressRepo.createAddress(
                fullName: any(named: 'fullName'),
                phone: any(named: 'phone'),
                street: any(named: 'street'),
                city: any(named: 'city'),
                state: any(named: 'state'),
                country: any(named: 'country'),
                zipCode: any(named: 'zipCode'),
              )).thenAnswer((_) async => _secondAddress);
        },
        seed: () => CheckoutAddressStep(
          addresses: [_defaultAddress],
          selectedAddress: _defaultAddress,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutAddressAdded(
          fullName: 'John Doe',
          phone: '0987654321',
          street: '2 Oak Ave',
          city: 'Shelbyville',
          state: 'IL',
          country: 'US',
          zipCode: '62565',
        )),
        expect: () => [
          isA<CheckoutAddressStep>()
              .having((s) => s.isAddingAddress, 'isAddingAddress', true),
          CheckoutAddressStep(
            addresses: [_defaultAddress, _secondAddress],
            selectedAddress: _secondAddress,
          ),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'shows inline error and stays in AddressStep on API failure',
        setUp: () {
          when(() => addressRepo.createAddress(
                fullName: any(named: 'fullName'),
                phone: any(named: 'phone'),
                street: any(named: 'street'),
                city: any(named: 'city'),
                state: any(named: 'state'),
                country: any(named: 'country'),
                zipCode: any(named: 'zipCode'),
              )).thenThrow(const ApiException('Invalid address'));
        },
        seed: () => CheckoutAddressStep(
          addresses: [_defaultAddress],
          selectedAddress: _defaultAddress,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutAddressAdded(
          fullName: 'X',
          phone: '1234567',
          street: 'X',
          city: 'X',
          state: 'XX',
          country: 'US',
          zipCode: '00000',
        )),
        expect: () => [
          isA<CheckoutAddressStep>()
              .having((s) => s.isAddingAddress, 'loading', true),
          isA<CheckoutAddressStep>()
              .having((s) => s.error, 'error', 'Invalid address')
              .having((s) => s.isAddingAddress, 'isAddingAddress', false),
        ],
      );
    });

    // ── CheckoutProceedToSummary ─────────────────────────────────────────────

    group('CheckoutProceedToSummary', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'emits SummaryStep with cart and selected address',
        setUp: () {
          when(() => cartCubit.state).thenReturn(CartLoaded(cart: _cart));
        },
        seed: () => CheckoutAddressStep(
          addresses: [_defaultAddress],
          selectedAddress: _defaultAddress,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToSummary()),
        expect: () => [
          CheckoutSummaryStep(selectedAddress: _defaultAddress, cart: _cart),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'does nothing when no address is selected',
        setUp: () {
          when(() => cartCubit.state).thenReturn(CartLoaded(cart: _cart));
        },
        seed: () => const CheckoutAddressStep(
          addresses: [],
          selectedAddress: null,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToSummary()),
        expect: () => [],
      );
    });

    // ── CheckoutBackToAddress ────────────────────────────────────────────────

    group('CheckoutBackToAddress', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'returns to address step from summary using cached data (no fetch)',
        seed: () => CheckoutSummaryStep(
          selectedAddress: _defaultAddress,
          cart: _cart,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutBackToAddress()),
        expect: () => [
          // No network call; just re-emit address step
          isA<CheckoutAddressStep>().having(
            (s) => s.selectedAddress?.id,
            'selectedAddress',
            _defaultAddress.id,
          ),
        ],
        // Verify NO address repository call was made
        verify: (_) => verifyNever(() => addressRepo.getAddresses()),
      );
    });

    // ── CheckoutProceedToPayment (success path) ──────────────────────────────

    group('CheckoutProceedToPayment — success', () {
      setUp(() {
        when(() => orderRepo.createOrder(
              addressId: any(named: 'addressId'),
              promoCode: any(named: 'promoCode'),
            )).thenAnswer((_) async => _order);
        when(() => orderRepo.createPaymentIntent(
              orderId: any(named: 'orderId'),
            )).thenAnswer((_) async => 'pi_test_secret');
        when(() => stripeService.initPaymentSheet(
              clientSecret: any(named: 'clientSecret'),
              merchantDisplayName: any(named: 'merchantDisplayName'),
            )).thenAnswer((_) async {});
        when(() => stripeService.presentPaymentSheet())
            .thenAnswer((_) async {});
        when(() => cartCubit.loadCart()).thenAnswer((_) async {});
      });

      blocTest<CheckoutBloc, CheckoutState>(
        'emits [PaymentInProgress, CheckoutSuccess] on happy path',
        seed: () => CheckoutSummaryStep(
          selectedAddress: _defaultAddress,
          cart: _cart,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToPayment()),
        expect: () => [
          isA<CheckoutPaymentInProgress>(),
          isA<CheckoutSuccess>().having(
            (s) => s.order.orderNumber,
            'orderNumber',
            'ORD-20260323-ABCD1234',
          ),
        ],
        verify: (_) {
          verify(() => orderRepo.createOrder(
                addressId: _defaultAddress.id,
                promoCode: null,
              )).called(1);
          verify(() => orderRepo.createPaymentIntent(orderId: _order.id))
              .called(1);
          verify(() => stripeService.presentPaymentSheet()).called(1);
          verify(() => cartCubit.loadCart()).called(1);
        },
      );
    });

    // ── CheckoutProceedToPayment (user cancels) ──────────────────────────────

    group('CheckoutProceedToPayment — Stripe cancel', () {
      setUp(() {
        when(() => orderRepo.createOrder(
              addressId: any(named: 'addressId'),
              promoCode: any(named: 'promoCode'),
            )).thenAnswer((_) async => _order);
        when(() => orderRepo.createPaymentIntent(
              orderId: any(named: 'orderId'),
            )).thenAnswer((_) async => 'pi_test_secret');
        when(() => stripeService.initPaymentSheet(
              clientSecret: any(named: 'clientSecret'),
              merchantDisplayName: any(named: 'merchantDisplayName'),
            )).thenAnswer((_) async {});
        when(() => stripeService.presentPaymentSheet()).thenThrow(
          StripeException(
            error: const LocalizedErrorMessage(
              code: FailureCode.Canceled,
              message: 'User canceled',
            ),
          ),
        );
      });

      blocTest<CheckoutBloc, CheckoutState>(
        'returns to SummaryStep with pendingOrder set when user dismisses Payment Sheet',
        seed: () => CheckoutSummaryStep(
          selectedAddress: _defaultAddress,
          cart: _cart,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToPayment()),
        expect: () => [
          isA<CheckoutPaymentInProgress>(),
          // Back to summary with pendingOrder so a retry skips createOrder.
          isA<CheckoutSummaryStep>().having(
            (s) => s.pendingOrder?.id,
            'pendingOrder.id',
            _order.id,
          ),
        ],
        verify: (_) => verifyNever(() => cartCubit.loadCart()),
      );
    });

    // ── CheckoutProceedToPayment (payment error) ─────────────────────────────

    group('CheckoutProceedToPayment — payment failure', () {
      setUp(() {
        when(() => orderRepo.createOrder(
              addressId: any(named: 'addressId'),
              promoCode: any(named: 'promoCode'),
            )).thenAnswer((_) async => _order);
        when(() => orderRepo.createPaymentIntent(
              orderId: any(named: 'orderId'),
            )).thenAnswer((_) async => 'pi_test_secret');
        when(() => stripeService.initPaymentSheet(
              clientSecret: any(named: 'clientSecret'),
              merchantDisplayName: any(named: 'merchantDisplayName'),
            )).thenAnswer((_) async {});
        when(() => stripeService.presentPaymentSheet()).thenThrow(
          StripeException(
            error: const LocalizedErrorMessage(
              code: FailureCode.Failed,
              message: 'Card declined',
            ),
          ),
        );
      });

      blocTest<CheckoutBloc, CheckoutState>(
        'emits CheckoutError with failedOrderId preserved',
        seed: () => CheckoutSummaryStep(
          selectedAddress: _defaultAddress,
          cart: _cart,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToPayment()),
        expect: () => [
          isA<CheckoutPaymentInProgress>(),
          isA<CheckoutError>()
              .having((e) => e.lastStep, 'lastStep', CheckoutStep.payment)
              .having((e) => e.failedOrderId, 'failedOrderId', _order.id),
        ],
      );
    });

    // ── CheckoutProceedToPayment (pendingOrder reuse) ────────────────────────

    group('CheckoutProceedToPayment — pendingOrder reuse', () {
      setUp(() {
        when(() => orderRepo.createPaymentIntent(
              orderId: any(named: 'orderId'),
            )).thenAnswer((_) async => 'pi_retry_secret');
        when(() => stripeService.initPaymentSheet(
              clientSecret: any(named: 'clientSecret'),
              merchantDisplayName: any(named: 'merchantDisplayName'),
            )).thenAnswer((_) async {});
        when(() => stripeService.presentPaymentSheet())
            .thenAnswer((_) async {});
        when(() => cartCubit.loadCart()).thenAnswer((_) async {});
      });

      blocTest<CheckoutBloc, CheckoutState>(
        'skips createOrder and reuses pendingOrder when set',
        seed: () => CheckoutSummaryStep(
          selectedAddress: _defaultAddress,
          cart: _cart,
          pendingOrder: _order, // already has a pending order from prior attempt
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToPayment()),
        expect: () => [
          isA<CheckoutPaymentInProgress>(),
          isA<CheckoutSuccess>().having(
            (s) => s.order.id,
            'order.id',
            _order.id,
          ),
        ],
        verify: (_) {
          verifyNever(() => orderRepo.createOrder(
                addressId: any(named: 'addressId'),
                promoCode: any(named: 'promoCode'),
              ));
          verify(() => orderRepo.createPaymentIntent(orderId: _order.id))
              .called(1);
        },
      );
    });

    // ── CheckoutProceedToPayment (createOrder fails) ─────────────────────────

    group('CheckoutProceedToPayment — createOrder failure', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'emits CheckoutError with no failedOrderId when order creation fails',
        setUp: () {
          when(() => orderRepo.createOrder(
                addressId: any(named: 'addressId'),
                promoCode: any(named: 'promoCode'),
              )).thenThrow(const ApiException('Insufficient stock'));
        },
        seed: () => CheckoutSummaryStep(
          selectedAddress: _defaultAddress,
          cart: _cart,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutProceedToPayment()),
        expect: () => [
          isA<CheckoutPaymentInProgress>(),
          isA<CheckoutError>()
              .having((e) => e.message, 'message', 'Insufficient stock')
              .having((e) => e.failedOrderId, 'failedOrderId', isNull),
        ],
      );
    });

    // ── CheckoutRetried ──────────────────────────────────────────────────────

    group('CheckoutRetried', () {
      blocTest<CheckoutBloc, CheckoutState>(
        'restores summary step on payment error with saved summary',
        setUp: () {
          when(() => addressRepo.getAddresses()).thenAnswer(
            (_) async => [_defaultAddress],
          );
        },
        seed: () {
          final summary = CheckoutSummaryStep(
            selectedAddress: _defaultAddress,
            cart: _cart,
          );
          return CheckoutError(
            message: 'Card declined',
            lastStep: CheckoutStep.payment,
            previousSummaryStep: summary,
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutRetried()),
        expect: () => [
          CheckoutSummaryStep(selectedAddress: _defaultAddress, cart: _cart),
        ],
        // No address fetch on payment retry
        verify: (_) => verifyNever(() => addressRepo.getAddresses()),
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'threads failedOrder into pendingOrder on summary step when retrying after payment failure',
        setUp: () {},
        seed: () {
          final summary = CheckoutSummaryStep(
            selectedAddress: _defaultAddress,
            cart: _cart,
          );
          return CheckoutError(
            message: 'Card declined',
            lastStep: CheckoutStep.payment,
            previousSummaryStep: summary,
            failedOrder: _order, // order was created but payment failed
          );
        },
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutRetried()),
        expect: () => [
          CheckoutSummaryStep(
            selectedAddress: _defaultAddress,
            cart: _cart,
            pendingOrder: _order,
          ),
        ],
      );

      blocTest<CheckoutBloc, CheckoutState>(
        'restarts from address step on address error',
        setUp: () {
          when(() => addressRepo.getAddresses()).thenAnswer(
            (_) async => [_defaultAddress],
          );
        },
        seed: () => const CheckoutError(
          message: 'Network error',
          lastStep: CheckoutStep.address,
        ),
        build: buildBloc,
        act: (bloc) => bloc.add(const CheckoutRetried()),
        expect: () => [
          const CheckoutAddressesLoading(),
          CheckoutAddressStep(
            addresses: [_defaultAddress],
            selectedAddress: _defaultAddress,
          ),
        ],
      );
    });
  });
}
