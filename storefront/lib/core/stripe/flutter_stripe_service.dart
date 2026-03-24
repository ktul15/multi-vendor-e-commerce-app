import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_stripe/flutter_stripe.dart';
import 'stripe_service.dart';

class FlutterStripeService implements StripeService {
  const FlutterStripeService();

  @override
  Future<void> initPaymentSheet({
    required String clientSecret,
    required String merchantDisplayName,
    ThemeMode style = ThemeMode.system,
  }) async {
    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        merchantDisplayName: merchantDisplayName,
        paymentIntentClientSecret: clientSecret,
        style: style,
      ),
    );
  }

  @override
  Future<void> presentPaymentSheet() async {
    await Stripe.instance.presentPaymentSheet();
  }
}
