import 'package:equatable/equatable.dart';
import '../../../shared/models/address_model.dart';

sealed class CheckoutEvent extends Equatable {
  const CheckoutEvent();

  @override
  List<Object?> get props => [];
}

/// Kicks off the checkout flow: loads saved addresses.
class CheckoutStarted extends CheckoutEvent {
  const CheckoutStarted();
}

/// User tapped a different address card.
class CheckoutAddressSelected extends CheckoutEvent {
  final AddressModel address;
  const CheckoutAddressSelected(this.address);

  @override
  List<Object?> get props => [address];
}

/// User submitted the add-address form.
class CheckoutAddressAdded extends CheckoutEvent {
  final String fullName;
  final String phone;
  final String street;
  final String city;
  final String state;
  final String country;
  final String zipCode;

  const CheckoutAddressAdded({
    required this.fullName,
    required this.phone,
    required this.street,
    required this.city,
    required this.state,
    required this.country,
    required this.zipCode,
  });

  @override
  List<Object?> get props =>
      [fullName, phone, street, city, state, country, zipCode];
}

/// User tapped "Continue" on the address step.
class CheckoutProceedToSummary extends CheckoutEvent {
  const CheckoutProceedToSummary();
}

/// User tapped the back button from the summary step.
/// Re-emits the address step from cached data (no network call).
class CheckoutBackToAddress extends CheckoutEvent {
  const CheckoutBackToAddress();
}

/// User tapped "Pay" on the summary step — triggers order creation + Payment Sheet.
class CheckoutProceedToPayment extends CheckoutEvent {
  const CheckoutProceedToPayment();
}

/// User tapped "Retry" on the error screen.
class CheckoutRetried extends CheckoutEvent {
  const CheckoutRetried();
}
