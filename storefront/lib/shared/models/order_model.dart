import 'package:equatable/equatable.dart';

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
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
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
    );
  }

  /// Display-safe status string. Falls back to 'PENDING' when the backend
  /// omits the field to prevent null propagation in the UI.
  String get displayStatus => status ?? 'PENDING';

  @override
  List<Object?> get props =>
      [id, orderNumber, status, subtotal, discount, tax, total, notes, createdAt];
}
