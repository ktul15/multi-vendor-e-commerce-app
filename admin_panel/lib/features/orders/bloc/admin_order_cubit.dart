import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/admin_order_repository.dart';
import 'admin_order_state.dart';

class AdminOrderCubit extends Cubit<AdminOrderState> {
  final AdminOrderRepository _repository;

  AdminOrderCubit({required AdminOrderRepository repository})
      : _repository = repository,
        super(const AdminOrderInitial());

  // ── Initial load ──────────────────────────────────────────────────────────

  Future<void> load() async {
    emit(const AdminOrderLoading());
    try {
      final result = await _repository.listOrders(
        page: 1,
        limit: AdminOrderLoaded.pageLimit,
      );
      emit(AdminOrderLoaded(items: result.items, meta: result.meta));
    } on ApiException catch (e) {
      emit(AdminOrderError(e.message));
    } catch (_) {
      emit(const AdminOrderError('Something went wrong. Please try again.'));
    }
  }

  /// Loads only if not already loaded or loading.
  /// Safe to call on every route rebuild — skips the network call when fresh.
  Future<void> ensureLoaded() async {
    if (state is AdminOrderLoaded || state is AdminOrderLoading) return;
    await load();
  }

  // ── Filter / page ──────────────────────────────────────────────────────────

  /// Filter by status chip. null = "All". Resets to page 1.
  /// Returns an error message on failure, null on success.
  Future<String?> filterByStatus(String? status) async {
    final current = state;
    if (current is! AdminOrderLoaded) return null;
    if (current.statusFilter == status) return null;
    return _fetchPage(
      page: 1,
      status: status,
      startDate: current.startDate,
      endDate: current.endDate,
      newStatus: status,
      newStartDate: current.startDate,
      newEndDate: current.endDate,
    );
  }

  /// Apply a date range filter. Validates ≤366 days before hitting the API.
  /// Returns an error message on failure/validation error, null on success.
  Future<String?> applyDateRange(DateTime start, DateTime end) async {
    final current = state;
    if (current is! AdminOrderLoaded) return null;

    const maxDays = 366;
    final diff = end.difference(start).inDays;
    if (diff > maxDays) {
      return 'Date range cannot exceed $maxDays days';
    }
    if (start.isAfter(end)) {
      return 'Start date must be before end date';
    }

    return _fetchPage(
      page: 1,
      status: current.statusFilter,
      startDate: start,
      endDate: end,
      newStatus: current.statusFilter,
      newStartDate: start,
      newEndDate: end,
    );
  }

  /// Clear the date range filter. Resets to page 1.
  /// Returns an error message on failure, null on success.
  Future<String?> clearDateRange() async {
    final current = state;
    if (current is! AdminOrderLoaded) return null;
    if (current.startDate == null && current.endDate == null) return null;
    return _fetchPage(
      page: 1,
      status: current.statusFilter,
      startDate: null,
      endDate: null,
      newStatus: current.statusFilter,
      newStartDate: null,
      newEndDate: null,
    );
  }

  /// Navigate to the next page.
  Future<String?> nextPage() async {
    final current = state;
    if (current is! AdminOrderLoaded || !current.hasNextPage) return null;
    return _fetchPage(
      page: current.meta.page + 1,
      status: current.statusFilter,
      startDate: current.startDate,
      endDate: current.endDate,
      newStatus: current.statusFilter,
      newStartDate: current.startDate,
      newEndDate: current.endDate,
    );
  }

  /// Navigate to the previous page.
  Future<String?> prevPage() async {
    final current = state;
    if (current is! AdminOrderLoaded || !current.hasPrevPage) return null;
    return _fetchPage(
      page: current.meta.page - 1,
      status: current.statusFilter,
      startDate: current.startDate,
      endDate: current.endDate,
      newStatus: current.statusFilter,
      newStartDate: current.startDate,
      newEndDate: current.endDate,
    );
  }

  /// Reload the current page with the current filters.
  Future<void> refresh() async {
    final current = state;
    if (current is AdminOrderLoaded) {
      await _fetchPage(
        page: current.meta.page,
        status: current.statusFilter,
        startDate: current.startDate,
        endDate: current.endDate,
        newStatus: current.statusFilter,
        newStartDate: current.startDate,
        newEndDate: current.endDate,
      );
    } else {
      await load();
    }
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  /// Fetches full order detail. Called from OrderDetailPage.initState.
  /// Result is stored in AdminOrderLoaded.selectedOrderDetail.
  Future<void> loadOrderDetail(String orderId) async {
    final current = state;
    if (current is! AdminOrderLoaded) return;

    // Clear the previous detail immediately so navigating to a different order
    // does not flash the old order's data while the new fetch is in flight.
    emit(current.copyWith(
      isDetailLoading: true,
      clearDetailError: true,
      clearSelectedOrderDetail: true,
    ));
    try {
      final detail = await _repository.getOrderById(orderId);

      // Stale-state guard — discard if the list navigated away.
      final s = state;
      if (s is! AdminOrderLoaded) return;
      emit(s.copyWith(selectedOrderDetail: detail, isDetailLoading: false));
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminOrderLoaded) {
        emit(s.copyWith(isDetailLoading: false, detailError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is AdminOrderLoaded) {
        emit(s.copyWith(
          isDetailLoading: false,
          detailError: 'Something went wrong. Please try again.',
        ));
      }
    }
  }

  void clearTransientError() {
    final current = state;
    if (current is AdminOrderLoaded) {
      emit(current.copyWith(clearTransientError: true));
    }
  }

  void clearDetailError() {
    final current = state;
    if (current is AdminOrderLoaded) {
      emit(current.copyWith(clearDetailError: true));
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<String?> _fetchPage({
    required int page,
    required String? status,
    required DateTime? startDate,
    required DateTime? endDate,
    required String? newStatus,
    required DateTime? newStartDate,
    required DateTime? newEndDate,
  }) async {
    final current = state;
    if (current is! AdminOrderLoaded) return null;

    emit(current.copyWith(isRefreshing: true));
    try {
      final result = await _repository.listOrders(
        page: page,
        limit: AdminOrderLoaded.pageLimit,
        status: status,
        startDate: startDate,
        endDate: endDate,
      );

      // Stale-state guard.
      final s = state;
      if (s is! AdminOrderLoaded) return null;

      emit(s.copyWith(
        items: result.items,
        meta: result.meta,
        statusFilter: newStatus,
        clearStatusFilter: newStatus == null,
        startDate: newStartDate,
        clearStartDate: newStartDate == null,
        endDate: newEndDate,
        clearEndDate: newEndDate == null,
        isRefreshing: false,
      ));
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is AdminOrderLoaded) emit(s.copyWith(isRefreshing: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is AdminOrderLoaded) emit(s.copyWith(isRefreshing: false));
      return 'Something went wrong. Please try again.';
    }
  }
}
