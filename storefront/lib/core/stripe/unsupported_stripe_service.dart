import 'package:flutter/material.dart' show ThemeMode;
import 'stripe_service.dart';

class UnsupportedStripeService implements StripeService {
  const UnsupportedStripeService();

  @override
  Future<void> initPaymentSheet({
    required String clientSecret,
    required String merchantDisplayName,
    ThemeMode style = ThemeMode.system,
  }) {
    throw UnsupportedError('Stripe Payment Sheet is not available on web.');
  }

  @override
  Future<void> presentPaymentSheet() {
    throw UnsupportedError('Stripe Payment Sheet is not available on web.');
  }
}
