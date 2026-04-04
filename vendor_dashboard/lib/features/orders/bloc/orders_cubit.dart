import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/order_repository.dart';
import 'orders_state.dart';

class OrdersCubit extends Cubit<OrdersState> {
  final OrderRepository _orderRepository;

  OrdersCubit({required OrderRepository orderRepository})
      : _orderRepository = orderRepository,
        super(OrdersInitial());

  Future<void> load({String? status}) async {
    emit(OrdersLoading());
    try {
      final result = await _orderRepository.getVendorOrders(
        page: 1,
        limit: 50,
        status: status,
      );
      emit(OrdersLoaded(result.orders, activeStatus: status, total: result.total));
    } catch (e) {
      emit(OrdersError(e.toString()));
    }
  }

  Future<void> updateStatus(
    String vendorOrderId,
    String status, {
    String? trackingNumber,
    String? trackingCarrier,
  }) async {
    final current = state;
    try {
      await _orderRepository.updateOrderStatus(
        vendorOrderId,
        status,
        trackingNumber: trackingNumber,
        trackingCarrier: trackingCarrier,
      );
      final activeStatus = current is OrdersLoaded ? current.activeStatus : null;
      await load(status: activeStatus);
    } catch (e) {
      emit(OrdersError(e.toString()));
    }
  }
}
