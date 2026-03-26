import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/order_repository.dart';
import 'order_list_state.dart';

class OrderListCubit extends Cubit<OrderListState> {
  final OrderRepository _repository;

  static const int _pageSize = 10;

  OrderListCubit({required OrderRepository repository})
      : _repository = repository,
        super(const OrderListInitial());

  /// Load orders from page 1 with an optional status filter.
  Future<void> loadOrders({String? statusFilter}) async {
    emit(const OrderListLoading());
    try {
      final page = await _repository.getOrders(
        page: 1,
        limit: _pageSize,
        status: statusFilter,
      );
      emit(OrderListLoaded(
        orders: page.items,
        total: page.total,
        currentPage: page.page,
        totalPages: page.totalPages,
        activeFilter: statusFilter,
      ));
    } on ApiException catch (e) {
      emit(OrderListError(message: e.message, activeFilter: statusFilter));
    } on NetworkException catch (e) {
      emit(OrderListError(message: e.message, activeFilter: statusFilter));
    } catch (e) {
      emit(OrderListError(message: e.toString(), activeFilter: statusFilter));
    }
  }

  /// Append next page (infinite scroll). No-op if already loading or at end.
  Future<void> loadMore() async {
    final current = state;
    if (current is! OrderListLoaded) return;
    if (!current.hasMore || current.isLoadingMore) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final page = await _repository.getOrders(
        page: current.currentPage + 1,
        limit: _pageSize,
        status: current.activeFilter,
      );
      emit(current.copyWith(
        orders: [...current.orders, ...page.items],
        currentPage: page.page,
        totalPages: page.totalPages,
        total: page.total,
        isLoadingMore: false,
      ));
    } catch (_) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  /// Switch filter tab and reload from page 1.
  Future<void> changeFilter(String? status) {
    if (state is OrderListLoading) return Future.value();
    return loadOrders(statusFilter: status);
  }

  /// Pull-to-refresh: reload page 1 with current filter.
  Future<void> refresh() {
    final current = state;
    final filter = current is OrderListLoaded
        ? current.activeFilter
        : current is OrderListError
            ? current.activeFilter
            : null;
    return loadOrders(statusFilter: filter);
  }
}
