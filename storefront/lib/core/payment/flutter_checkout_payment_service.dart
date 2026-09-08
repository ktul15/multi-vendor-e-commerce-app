import 'dart:async';

import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../shared/models/payment_checkout.dart';
import '../stripe/stripe_service.dart';
import 'checkout_payment_service.dart';

class FlutterCheckoutPaymentService implements CheckoutPaymentService {
  final StripeService _stripeService;
  final Duration _razorpayTimeout;

  FlutterCheckoutPaymentService({
    required StripeService stripeService,
    Duration razorpayTimeout = const Duration(seconds: 90),
  }) : _stripeService = stripeService,
       _razorpayTimeout = razorpayTimeout;

  @override
  Future<PaymentCheckoutResult?> present(
    PaymentCheckout checkout, {
    required String merchantDisplayName,
  }) async {
    if (checkout.provider == PaymentProvider.stripe) {
      try {
        await _stripeService.initPaymentSheet(
          clientSecret: checkout.clientSecret!,
          merchantDisplayName: merchantDisplayName,
        );
        await _stripeService.presentPaymentSheet();
        return null;
      } on StripeException catch (error) {
        throw CheckoutPaymentException(
          error.error.localizedMessage ?? 'Stripe payment failed',
          cancelled: error.error.code == FailureCode.Canceled,
        );
      }
    }

    final mock = checkout.mockConfirmation;
    if (mock != null) {
      return PaymentCheckoutResult(
        providerOrderId: checkout.providerOrderId!,
        providerPaymentId: mock.paymentId,
        signature: mock.signature,
      );
    }

    final completer = Completer<PaymentCheckoutResult>();
    final razorpay = Razorpay();
    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse value) {
      if (!completer.isCompleted &&
          value.orderId != null &&
          value.paymentId != null &&
          value.signature != null) {
        completer.complete(
          PaymentCheckoutResult(
            providerOrderId: value.orderId!,
            providerPaymentId: value.paymentId!,
            signature: value.signature!,
          ),
        );
      }
    });
    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse value) {
      if (!completer.isCompleted) {
        completer.completeError(
          CheckoutPaymentException(
            value.message ?? 'Razorpay payment failed',
            cancelled: value.code == Razorpay.PAYMENT_CANCELLED,
          ),
        );
      }
    });

    try {
      razorpay.open({
        'key': checkout.keyId,
        'order_id': checkout.providerOrderId,
        'amount': checkout.amount,
        'currency': checkout.currency,
        'name': checkout.name ?? merchantDisplayName,
        'description': checkout.description,
        'prefill': checkout.prefill,
        'retry': {'enabled': true, 'max_count': 4},
      });
      return await completer.future.timeout(_razorpayTimeout);
    } on TimeoutException {
      throw CheckoutPaymentException('Razorpay payment timed out');
    } finally {
      razorpay.clear();
    }
  }
}
