import 'package:equatable/equatable.dart';
import '../../../shared/models/order_model.dart';

sealed class OrderListState extends Equatable {
  const OrderListState();

  @override
  List<Object?> get props => [];
}

class OrderListInitial extends OrderListState {
  const OrderListInitial();
}

class OrderListLoading extends OrderListState {
  const OrderListLoading();
}

class OrderListLoaded extends OrderListState {
  final List<OrderModel> orders;
  final int total;
  final int currentPage;
  final int totalPages;
  final String? activeFilter;
  final bool isLoadingMore;

  const OrderListLoaded({
    required this.orders,
    required this.total,
    required this.currentPage,
    required this.totalPages,
    this.activeFilter,
    this.isLoadingMore = false,
  });

  bool get hasMore => currentPage < totalPages;

  OrderListLoaded copyWith({
    List<OrderModel>? orders,
    int? total,
    int? currentPage,
    int? totalPages,
    String? activeFilter,
    bool clearFilter = false,
    bool? isLoadingMore,
  }) {
    return OrderListLoaded(
      orders: orders ?? this.orders,
      total: total ?? this.total,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      activeFilter: clearFilter ? null : (activeFilter ?? this.activeFilter),
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [
        orders,
        total,
        currentPage,
        totalPages,
        activeFilter,
        isLoadingMore,
      ];
}

class OrderListError extends OrderListState {
  final String message;
  final String? activeFilter;

  const OrderListError({required this.message, this.activeFilter});

  @override
  List<Object?> get props => [message, activeFilter];
}
