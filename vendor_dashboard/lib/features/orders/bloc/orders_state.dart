import 'package:equatable/equatable.dart';
import '../../../shared/models/vendor_order.dart';

abstract class OrdersState extends Equatable {
  const OrdersState();

  @override
  List<Object?> get props => [];
}

class OrdersInitial extends OrdersState {}

class OrdersLoading extends OrdersState {}

class OrdersLoaded extends OrdersState {
  final List<VendorOrder> orders;
  final String? activeStatus;
  final int total;

  const OrdersLoaded(
    this.orders, {
    this.activeStatus,
    this.total = 0,
  });

  @override
  List<Object?> get props => [orders, activeStatus, total];
}

class OrdersError extends OrdersState {
  final String message;

  const OrdersError(this.message);

  @override
  List<Object?> get props => [message];
}
