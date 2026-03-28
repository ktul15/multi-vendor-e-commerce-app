import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/network/api_exception.dart';
import '../../../repositories/order_repository.dart';
import 'order_detail_state.dart';

class OrderDetailCubit extends Cubit<OrderDetailState> {
  final OrderRepository _repository;

  OrderDetailCubit({required OrderRepository repository})
      : _repository = repository,
        super(const OrderDetailInitial());

  Future<void> loadOrder(String id) async {
    if (state is OrderDetailLoading) return;
    emit(const OrderDetailLoading());
    try {
      final order = await _repository.getOrderById(id);
      emit(OrderDetailLoaded(order: order));
    } on ApiException catch (e) {
      emit(OrderDetailError(message: e.message, orderId: id));
    } on NetworkException catch (e) {
      emit(OrderDetailError(message: e.message, orderId: id));
    } catch (e) {
      emit(OrderDetailError(message: e.toString(), orderId: id));
    }
  }

  void clearCancelError() {
    final current = state;
    if (current is OrderDetailLoaded && current.cancelError != null) {
      emit(current.copyWith(clearCancelError: true));
    }
  }

  Future<void> cancelOrder(String id, {String? reason}) async {
    final current = state;
    if (current is! OrderDetailLoaded || current.isCancelling) return;

    emit(current.copyWith(isCancelling: true, clearCancelError: true));
    try {
      final updated = await _repository.cancelOrder(id, reason: reason);
      emit(OrderDetailLoaded(order: updated));
    } on ApiException catch (e) {
      emit(current.copyWith(isCancelling: false, cancelError: e.message));
    } on NetworkException catch (e) {
      emit(current.copyWith(isCancelling: false, cancelError: e.message));
    } catch (e) {
      emit(current.copyWith(isCancelling: false, cancelError: e.toString()));
    }
  }
}
