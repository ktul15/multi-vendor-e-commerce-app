import 'package:equatable/equatable.dart';

import 'address_model.dart';

// ── Order item (nested inside vendor orders) ─────────────────────────────────

class OrderItemDetail extends Equatable {
  final String id;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final String? variantSku;
  final String? variantSize;
  final String? variantColor;
  final double variantPrice;
  final String productName;
  final List<String> productImages;

  const OrderItemDetail({
    required this.id,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.variantSku,
    this.variantSize,
    this.variantColor,
    required this.variantPrice,
    required this.productName,
    this.productImages = const [],
  });

  factory OrderItemDetail.fromJson(Map<String, dynamic> json) {
    final variant = json['variant'] as Map<String, dynamic>? ?? {};
    final product = variant['product'] as Map<String, dynamic>? ?? {};
    final images = product['images'] as List<dynamic>?;

    return OrderItemDetail(
      id: json['id'] as String,
      quantity: json['quantity'] as int,
      unitPrice: _toDouble(json['unitPrice']),
      totalPrice: _toDouble(json['totalPrice']),
      variantSku: variant['sku'] as String?,
      variantSize: variant['size'] as String?,
      variantColor: variant['color'] as String?,
      variantPrice: _toDouble(variant['price']),
      productName: product['name'] as String? ?? 'Unknown Product',
      productImages: images?.map((e) => e as String).toList() ?? const [],
    );
  }

  /// First image URL or null.
  String? get thumbnailUrl =>
      productImages.isNotEmpty ? productImages.first : null;

  /// Human-readable variant label (e.g. "Red / L").
  String? get variantLabel {
    final parts = <String>[
      if (variantColor != null) variantColor!,
      if (variantSize != null) variantSize!,
    ];
    return parts.isNotEmpty ? parts.join(' / ') : null;
  }

  @override
  List<Object?> get props => [
        id,
        quantity,
        unitPrice,
        totalPrice,
        variantSku,
        variantSize,
        variantColor,
        variantPrice,
        productName,
        productImages,
      ];
}

// ── Vendor order with full items ─────────────────────────────────────────────

class VendorOrderDetail extends Equatable {
  final String id;
  final String vendorId;
  final String status;
  final double subtotal;
  final List<OrderItemDetail> items;
  final String? trackingNumber;
  final DateTime createdAt;

  const VendorOrderDetail({
    required this.id,
    required this.vendorId,
    required this.status,
    required this.subtotal,
    this.items = const [],
    this.trackingNumber,
    required this.createdAt,
  });

  factory VendorOrderDetail.fromJson(Map<String, dynamic> json) {
    final itemsList = json['items'] as List<dynamic>?;

    return VendorOrderDetail(
      id: json['id'] as String,
      vendorId: json['vendorId'] as String,
      status: json['status'] as String? ?? 'PENDING',
      subtotal: _toDouble(json['subtotal']),
      items: itemsList
              ?.map(
                  (e) => OrderItemDetail.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      trackingNumber: json['trackingNumber'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props =>
      [id, vendorId, status, subtotal, items, trackingNumber, createdAt];
}

// ── Full payment detail ──────────────────────────────────────────────────────

class PaymentDetail extends Equatable {
  final String id;
  final double amount;
  final String currency;
  final String method;
  final String status;
  final String? stripePaymentIntentId;
  final DateTime? paidAt;

  const PaymentDetail({
    required this.id,
    required this.amount,
    required this.currency,
    required this.method,
    required this.status,
    this.stripePaymentIntentId,
    this.paidAt,
  });

  factory PaymentDetail.fromJson(Map<String, dynamic> json) {
    return PaymentDetail(
      id: json['id'] as String,
      amount: _toDouble(json['amount']),
      currency: json['currency'] as String? ?? 'USD',
      method: json['method'] as String,
      status: json['status'] as String,
      stripePaymentIntentId: json['stripePaymentIntentId'] as String?,
      paidAt: json['paidAt'] != null
          ? DateTime.parse(json['paidAt'] as String)
          : null,
    );
  }

  /// Human-readable method label.
  String get methodLabel => switch (method) {
        'CARD' => 'Credit / Debit Card',
        'CASH_ON_DELIVERY' => 'Cash on Delivery',
        'WALLET' => 'Wallet',
        _ => method,
      };

  @override
  List<Object?> get props =>
      [id, amount, currency, method, status, stripePaymentIntentId, paidAt];
}

// ── Order detail model ───────────────────────────────────────────────────────

class OrderDetailModel extends Equatable {
  final String id;
  final String orderNumber;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String? notes;
  final String? cancellationReason;
  final DateTime createdAt;
  final List<VendorOrderDetail> vendorOrders;
  final AddressModel address;
  final PaymentDetail? payment;

  const OrderDetailModel({
    required this.id,
    required this.orderNumber,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    this.notes,
    this.cancellationReason,
    required this.createdAt,
    this.vendorOrders = const [],
    required this.address,
    this.payment,
  });

  factory OrderDetailModel.fromJson(Map<String, dynamic> json) {
    final vendorOrdersList = json['vendorOrders'] as List<dynamic>?;
    final paymentJson = json['payment'] as Map<String, dynamic>?;
    final addressJson = json['address'] as Map<String, dynamic>?;
    if (addressJson == null) {
      throw const FormatException('Order missing required address field');
    }

    return OrderDetailModel(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      subtotal: _toDouble(json['subtotal']),
      discount: _toDouble(json['discount'] ?? 0),
      tax: _toDouble(json['tax'] ?? 0),
      total: _toDouble(json['total']),
      notes: json['notes'] as String?,
      cancellationReason: json['cancellationReason'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      vendorOrders: vendorOrdersList
              ?.map((e) =>
                  VendorOrderDetail.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      address: AddressModel.fromJson(addressJson),
      payment: paymentJson != null ? PaymentDetail.fromJson(paymentJson) : null,
    );
  }

  /// Derives an overall status from all vendor orders.
  ///
  /// When vendor orders have mixed statuses, the most "active" (attention-
  /// requiring) status wins so the customer sees the state that still needs
  /// progress rather than one that is already complete. For example, if one
  /// vendor has shipped while another is still processing, the customer sees
  /// "PROCESSING" (the least-progressed active state). CANCELLED is checked
  /// first because a partially-cancelled order should surface that clearly.
  String get overallStatus {
    if (vendorOrders.isEmpty) return 'PENDING';

    final statuses = vendorOrders.map((vo) => vo.status).toSet();
    if (statuses.length == 1) return statuses.first;

    const priority = [
      'CANCELLED',
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'REFUNDED',
    ];
    for (final s in priority) {
      if (statuses.contains(s)) return s;
    }
    return 'PENDING';
  }

  /// Whether the order can be cancelled (all vendor orders PENDING or CONFIRMED).
  bool get isCancellable {
    if (vendorOrders.isEmpty) return false;
    const cancellable = {'PENDING', 'CONFIRMED'};
    return vendorOrders.every((vo) => cancellable.contains(vo.status));
  }

  /// Flattened list of all items across vendor orders.
  List<OrderItemDetail> get allItems =>
      vendorOrders.expand((vo) => vo.items).toList();

  /// First tracking number found, if any.
  String? get trackingNumber {
    for (final vo in vendorOrders) {
      if (vo.trackingNumber != null) return vo.trackingNumber;
    }
    return null;
  }

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        subtotal,
        discount,
        tax,
        total,
        notes,
        cancellationReason,
        createdAt,
        vendorOrders,
        address,
        payment,
      ];
}

// ── Helper ───────────────────────────────────────────────────────────────────

/// Prisma Decimal fields may serialise as String or num.
/// Throws [FormatException] for unexpected types to surface bugs early.
double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.parse(value);
  if (value == null) return 0.0;
  throw FormatException('Expected num or String, got ${value.runtimeType}');
}
