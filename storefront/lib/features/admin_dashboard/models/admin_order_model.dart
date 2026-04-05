import 'package:equatable/equatable.dart';

class AdminOrderModel extends Equatable {
  final String id;
  final String orderNumber;
  final double total;
  final DateTime createdAt;
  final String customerName;
  final String status;

  const AdminOrderModel({
    required this.id,
    required this.orderNumber,
    required this.total,
    required this.createdAt,
    required this.customerName,
    required this.status,
  });

  factory AdminOrderModel.fromJson(Map<String, dynamic> json) {
    final vendorOrders = json['vendorOrders'] as List<dynamic>? ?? [];
    // Status derived from the first vendor order — intentional for the recent
    // orders table which shows a quick snapshot, not a definitive aggregate.
    // Single-vendor orders (the majority) are unambiguous. Multi-vendor orders
    // may show a partial status; a proper aggregate (e.g. lowest-priority
    // status across all sub-orders) can be added when a dedicated admin orders
    // screen is built.
    final firstStatus = vendorOrders.isNotEmpty
        ? ((vendorOrders.first as Map<String, dynamic>)['status'] as String? ??
            'PENDING')
        : 'PENDING';
    final user = json['user'] as Map<String, dynamic>? ?? {};

    return AdminOrderModel(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      total: double.parse(json['total'].toString()),
      createdAt: DateTime.parse(json['createdAt'] as String),
      customerName: user['name'] as String? ?? 'Unknown',
      status: firstStatus,
    );
  }

  @override
  List<Object?> get props => [id, orderNumber, total, createdAt, customerName, status];
}
