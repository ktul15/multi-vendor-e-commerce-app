import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_stripe/flutter_stripe.dart';
import '../config/app_env.dart';
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
        // PaymentSheet expects an ISO 3166-1 alpha-2 country code. Supplying
        // the INR storefront's country explicitly prevents the native sheet
        // from submitting the localized display value ("India") to Stripe.
        billingDetails: const BillingDetails(
          address: Address(
            city: null,
            country: 'IN',
            line1: null,
            line2: null,
            postalCode: null,
            state: null,
          ),
        ),
        // Required for Stripe-hosted authentication and redirect payment
        // methods to return control to the app instead of leaving the native
        // Payment Sheet future unresolved.
        returnURL: AppEnv.stripeReturnUrl,
        billingDetailsCollectionConfiguration:
            const BillingDetailsCollectionConfiguration(
              name: CollectionMode.automatic,
              address: AddressCollectionMode.automatic,
              attachDefaultsToPaymentMethod: true,
            ),
        style: style,
      ),
    );
  }

  @override
  Future<void> presentPaymentSheet() async {
    await Stripe.instance.presentPaymentSheet();
  }
}
