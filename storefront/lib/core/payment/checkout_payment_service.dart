import '../../shared/models/payment_checkout.dart';

class CheckoutPaymentException implements Exception {
  final String message;
  final bool cancelled;

  const CheckoutPaymentException(this.message, {this.cancelled = false});
}

abstract class CheckoutPaymentService {
  Future<PaymentCheckoutResult?> present(
    PaymentCheckout checkout, {
    required String merchantDisplayName,
  });
}
