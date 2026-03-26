import 'package:equatable/equatable.dart';
import 'order_model.dart';

class OrdersPage extends Equatable {
  final List<OrderModel> items;
  final int total;
  final int page;
  final int totalPages;

  const OrdersPage({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  bool get hasMore => page < totalPages;

  @override
  List<Object?> get props => [items, total, page, totalPages];
}
