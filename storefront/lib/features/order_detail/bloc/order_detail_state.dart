import 'package:equatable/equatable.dart';

import '../../../shared/models/order_detail_model.dart';

sealed class OrderDetailState extends Equatable {
  const OrderDetailState();
}

class OrderDetailInitial extends OrderDetailState {
  const OrderDetailInitial();

  @override
  List<Object?> get props => [];
}

class OrderDetailLoading extends OrderDetailState {
  const OrderDetailLoading();

  @override
  List<Object?> get props => [];
}

class OrderDetailLoaded extends OrderDetailState {
  final OrderDetailModel order;
  final bool isCancelling;
  final String? cancelError;

  const OrderDetailLoaded({
    required this.order,
    this.isCancelling = false,
    this.cancelError,
  });

  OrderDetailLoaded copyWith({
    OrderDetailModel? order,
    bool? isCancelling,
    String? cancelError,
    bool clearCancelError = false,
  }) {
    return OrderDetailLoaded(
      order: order ?? this.order,
      isCancelling: isCancelling ?? this.isCancelling,
      cancelError: clearCancelError ? null : (cancelError ?? this.cancelError),
    );
  }

  @override
  List<Object?> get props => [order, isCancelling, cancelError];
}

class OrderDetailError extends OrderDetailState {
  final String message;
  final String orderId;

  const OrderDetailError({required this.message, required this.orderId});

  @override
  List<Object?> get props => [message, orderId];
}
