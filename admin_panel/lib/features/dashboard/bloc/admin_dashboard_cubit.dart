import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/admin_dashboard_repository.dart';
import 'admin_dashboard_state.dart';

class AdminDashboardCubit extends Cubit<AdminDashboardState> {
  final AdminDashboardRepository _repository;

  AdminDashboardCubit({required AdminDashboardRepository repository})
      : _repository = repository,
        super(const AdminDashboardInitial());

  /// Skips the network call when data is already loaded (e.g. navigating back).
  /// The router calls this so the lazySingleton cubit doesn't refetch on every visit.
  void ensureLoaded() {
    if (state is AdminDashboardLoaded) return;
    load();
  }

  Future<void> load() async {
    emit(const AdminDashboardLoading());
    try {
      final results = await (
        _repository.getStats(),
        _repository.getRevenue(period: 'day'),
        _repository.getRecentOrders(),
      ).wait;

      emit(AdminDashboardLoaded(
        stats: results.$1,
        revenue: results.$2,
        recentOrders: results.$3,
        selectedPeriod: 'day',
      ));
    } on ApiException catch (e) {
      emit(AdminDashboardError(e.message));
    } catch (_) {
      emit(const AdminDashboardError('Something went wrong. Please try again.'));
    }
  }

  Future<void> changePeriod(String period) async {
    final current = state;
    if (current is! AdminDashboardLoaded) return;
    if (current.selectedPeriod == period || current.isRevenueLoading) return;

    emit(current.copyWith(selectedPeriod: period, isRevenueLoading: true));
    try {
      final revenue = await _repository.getRevenue(period: period);
      final updated = state;
      if (updated is AdminDashboardLoaded) {
        emit(updated.copyWith(revenue: revenue, isRevenueLoading: false));
      }
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminDashboardLoaded) {
        emit(s.copyWith(isRevenueLoading: false, revenueError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is AdminDashboardLoaded) {
        emit(s.copyWith(
          isRevenueLoading: false,
          revenueError: 'Failed to load revenue data',
        ));
      }
    }
  }

  Future<void> refresh() => load();
}
