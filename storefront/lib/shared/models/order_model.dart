import 'package:equatable/equatable.dart';

// ── Lightweight summaries for the order list endpoint ────────────────────────

class VendorOrderSummary extends Equatable {
  final String id;
  final String status;
  final double subtotal;
  final int itemCount;

  const VendorOrderSummary({
    required this.id,
    required this.status,
    required this.subtotal,
    required this.itemCount,
  });

  factory VendorOrderSummary.fromJson(Map<String, dynamic> json) {
    final count = json['_count'] as Map<String, dynamic>?;
    return VendorOrderSummary(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      subtotal: (json['subtotal'] as num).toDouble(),
      itemCount: count?['items'] as int? ?? 0,
    );
  }

  @override
  List<Object?> get props => [id, status, subtotal, itemCount];
}

class PaymentSummary extends Equatable {
  final String status;
  final String? method;
  final DateTime? paidAt;

  const PaymentSummary({
    required this.status,
    this.method,
    this.paidAt,
  });

  factory PaymentSummary.fromJson(Map<String, dynamic> json) {
    return PaymentSummary(
      status: json['status'] as String,
      method: json['method'] as String?,
      paidAt: json['paidAt'] != null
          ? DateTime.parse(json['paidAt'] as String)
          : null,
    );
  }

  @override
  List<Object?> get props => [status, method, paidAt];
}

// ── Order model ──────────────────────────────────────────────────────────────

class OrderModel extends Equatable {
  final String id;
  final String orderNumber;

  /// e.g. 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  final String? status;

  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String? notes;
  final DateTime createdAt;

  final List<VendorOrderSummary> vendorOrders;
  final PaymentSummary? payment;

  const OrderModel({
    required this.id,
    required this.orderNumber,
    this.status,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    this.notes,
    required this.createdAt,
    this.vendorOrders = const [],
    this.payment,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final vendorOrdersList = json['vendorOrders'] as List<dynamic>?;
    final paymentJson = json['payment'] as Map<String, dynamic>?;

    return OrderModel(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      status: json['status'] as String?,
      subtotal: (json['subtotal'] as num).toDouble(),
      discount: (json['discount'] as num? ?? 0).toDouble(),
      tax: (json['tax'] as num? ?? 0).toDouble(),
      total: (json['total'] as num).toDouble(),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      vendorOrders: vendorOrdersList
              ?.map((e) =>
                  VendorOrderSummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      payment:
          paymentJson != null ? PaymentSummary.fromJson(paymentJson) : null,
    );
  }

  /// Display-safe status string. Falls back to 'PENDING' when the backend
  /// omits the field to prevent null propagation in the UI.
  String get displayStatus => status ?? 'PENDING';

  /// Derives an overall status from all vendor orders.
  /// Priority: CANCELLED > SHIPPED > PROCESSING > CONFIRMED > PENDING > DELIVERED
  String get overallStatus {
    if (vendorOrders.isEmpty) return displayStatus;

    final statuses = vendorOrders.map((vo) => vo.status).toSet();

    // If all the same, use that status
    if (statuses.length == 1) return statuses.first;

    // Priority-based: pick the most "active" status
    const priority = [
      'CANCELLED',
      'SHIPPED',
      'PROCESSING',
      'CONFIRMED',
      'PENDING',
      'DELIVERED',
      'REFUNDED',
    ];
    for (final s in priority) {
      if (statuses.contains(s)) return s;
    }
    return displayStatus;
  }

  /// Total number of items across all vendor orders.
  int get totalItemCount =>
      vendorOrders.fold(0, (sum, vo) => sum + vo.itemCount);

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        status,
        subtotal,
        discount,
        tax,
        total,
        notes,
        createdAt,
        vendorOrders,
        payment,
      ];
}
