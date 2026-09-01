enum PaymentProvider { stripe, razorpay }

class MockRazorpayConfirmation {
  final String paymentId;
  final String signature;

  const MockRazorpayConfirmation({
    required this.paymentId,
    required this.signature,
  });
}

class PaymentCheckout {
  final PaymentProvider provider;
  final String? clientSecret;
  final String? providerOrderId;
  final String? keyId;
  final int? amount;
  final String? currency;
  final String? name;
  final String? description;
  final Map<String, dynamic> prefill;
  final MockRazorpayConfirmation? mockConfirmation;

  const PaymentCheckout({
    required this.provider,
    this.clientSecret,
    this.providerOrderId,
    this.keyId,
    this.amount,
    this.currency,
    this.name,
    this.description,
    this.prefill = const {},
    this.mockConfirmation,
  });

  factory PaymentCheckout.fromJson(Map<String, dynamic> json) {
    final providerName = json['provider'];
    if (providerName == 'STRIPE') {
      final clientSecret = json['clientSecret'];
      if (clientSecret is! String) {
        throw const FormatException('Stripe client secret is missing');
      }
      return PaymentCheckout(
        provider: PaymentProvider.stripe,
        clientSecret: clientSecret,
      );
    }
    if (providerName != 'RAZORPAY') {
      throw const FormatException('Unsupported payment provider');
    }
    final orderId = json['providerOrderId'];
    final keyId = json['keyId'];
    final amount = json['amount'];
    if (orderId is! String || keyId is! String || amount is! int) {
      throw const FormatException('Invalid Razorpay checkout response');
    }
    final mock = json['mockConfirmation'];
    return PaymentCheckout(
      provider: PaymentProvider.razorpay,
      providerOrderId: orderId,
      keyId: keyId,
      amount: amount,
      currency: json['currency'] as String? ?? 'INR',
      name: json['name'] as String?,
      description: json['description'] as String?,
      prefill: Map<String, dynamic>.from(json['prefill'] as Map? ?? const {}),
      mockConfirmation: mock is Map
          ? MockRazorpayConfirmation(
              paymentId: mock['paymentId'] as String,
              signature: mock['signature'] as String,
            )
          : null,
    );
  }
}

class PaymentCheckoutResult {
  final String providerOrderId;
  final String providerPaymentId;
  final String signature;

  const PaymentCheckoutResult({
    required this.providerOrderId,
    required this.providerPaymentId,
    required this.signature,
  });
}
