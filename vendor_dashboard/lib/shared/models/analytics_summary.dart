class OrderSummary {
  final int totalOrders;
  final int billableOrders;
  final Map<String, int> byStatus;

  const OrderSummary({
    required this.totalOrders,
    required this.billableOrders,
    required this.byStatus,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final byStatus = <String, int>{};
    final rawStatus = json['byStatus'] as Map<String, dynamic>? ?? {};
    rawStatus.forEach((k, v) => byStatus[k] = (v as num).toInt());
    return OrderSummary(
      totalOrders: (json['totalOrders'] as num).toInt(),
      billableOrders: (json['billableOrders'] as num).toInt(),
      byStatus: byStatus,
    );
  }
}

// Note: monetary values are stored as `double` for display only.
// All rendering uses `.toStringAsFixed(2)`, which masks floating-point imprecision.
// If these values are ever used in arithmetic, migrate to a Decimal package.
class RevenueSummary {
  final double gross;
  final double net;
  final double commission;

  const RevenueSummary({
    required this.gross,
    required this.net,
    required this.commission,
  });

  factory RevenueSummary.fromJson(Map<String, dynamic> json) {
    return RevenueSummary(
      gross: double.parse(json['gross'].toString()),
      net: double.parse(json['net'].toString()),
      commission: double.parse(json['commission'].toString()),
    );
  }
}

class AnalyticsSummary {
  final OrderSummary orders;
  final RevenueSummary revenue;

  const AnalyticsSummary({required this.orders, required this.revenue});

  factory AnalyticsSummary.fromJson(Map<String, dynamic> json) {
    return AnalyticsSummary(
      orders: OrderSummary.fromJson(json['orders'] as Map<String, dynamic>),
      revenue: RevenueSummary.fromJson(json['revenue'] as Map<String, dynamic>),
    );
  }
}
