import 'package:flutter/material.dart' show ThemeMode;

/// Thin abstraction over the Stripe SDK's Payment Sheet API.
/// Exists so CheckoutBloc can be unit-tested without hitting the real SDK.
abstract class StripeService {
  Future<void> initPaymentSheet({
    required String clientSecret,
    required String merchantDisplayName,
    ThemeMode style = ThemeMode.system,
  });

  Future<void> presentPaymentSheet();
}
