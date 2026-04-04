import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/analytics_repository.dart';
import '../../../repositories/order_repository.dart';
import 'dashboard_state.dart';

class DashboardCubit extends Cubit<DashboardState> {
  final AnalyticsRepository _analyticsRepository;
  final OrderRepository _orderRepository;

  DashboardCubit({
    required AnalyticsRepository analyticsRepository,
    required OrderRepository orderRepository,
  })  : _analyticsRepository = analyticsRepository,
        _orderRepository = orderRepository,
        super(DashboardInitial());

  Future<void> load() async {
    emit(DashboardLoading());
    try {
      final (summary, salesData, ordersResult) = await (
        _analyticsRepository.getSummary(),
        _analyticsRepository.getSales(period: 'day'),
        _orderRepository.getVendorOrders(page: 1, limit: 5),
      ).wait;

      emit(DashboardLoaded(
        summary: summary,
        salesData: salesData,
        recentOrders: ordersResult.orders,
      ));
    } catch (e) {
      emit(DashboardError(e.toString()));
    }
  }
}
