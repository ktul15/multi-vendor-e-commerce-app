import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/vendor_repository.dart';
import '../models/vendor_model.dart';
import 'vendor_state.dart';

class VendorCubit extends Cubit<VendorState> {
  final VendorRepository _repository;

  VendorCubit({required VendorRepository repository})
      : _repository = repository,
        super(const VendorInitial());

  // ── Initial load ─────────────────────────────────────────────────────────────

  Future<void> load() async {
    emit(const VendorLoading());
    try {
      final result = await _repository.listVendors(
        page: 1,
        limit: VendorLoaded.pageLimit,
      );
      emit(VendorLoaded(
        items: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      ));
    } on ApiException catch (e) {
      emit(VendorError(e.message));
    } catch (_) {
      emit(const VendorError('Something went wrong. Please try again.'));
    }
  }

  /// Loads only if not already loaded or loading.
  /// Safe to call on every route rebuild — skips the network call when fresh.
  Future<void> ensureLoaded() async {
    if (state is VendorLoaded || state is VendorLoading) return;
    await load();
  }

  // ── Filter / search / page ────────────────────────────────────────────────

  /// Called after debounce in the search field. Resets to page 1.
  /// Returns an error message on failure, null on success.
  Future<String?> search(String query) async {
    final current = state;
    if (current is! VendorLoaded) return null;
    if (current.searchQuery == query) return null;
    return _fetchPage(
      page: 1,
      search: query,
      status: current.statusFilter,
      newQuery: query,
      newStatus: current.statusFilter,
    );
  }

  /// Called when a status chip is tapped. null = "All". Resets to page 1.
  /// Returns an error message on failure, null on success.
  Future<String?> filterByStatus(String? status) async {
    final current = state;
    if (current is! VendorLoaded) return null;
    if (current.statusFilter == status) return null;
    return _fetchPage(
      page: 1,
      search: current.searchQuery,
      status: status,
      newQuery: current.searchQuery,
      newStatus: status,
    );
  }

  /// Navigate to the next page. Returns error message on failure, null on success.
  Future<String?> nextPage() async {
    final current = state;
    if (current is! VendorLoaded || !current.hasNextPage) return null;
    return _fetchPage(
      page: current.page + 1,
      search: current.searchQuery,
      status: current.statusFilter,
      newQuery: current.searchQuery,
      newStatus: current.statusFilter,
    );
  }

  /// Navigate to the previous page. Returns error message on failure, null on success.
  Future<String?> prevPage() async {
    final current = state;
    if (current is! VendorLoaded || !current.hasPrevPage) return null;
    return _fetchPage(
      page: current.page - 1,
      search: current.searchQuery,
      status: current.statusFilter,
      newQuery: current.searchQuery,
      newStatus: current.statusFilter,
    );
  }

  /// Reload the current page with the current filters.
  Future<void> refresh() async {
    final current = state;
    if (current is VendorLoaded) {
      await _fetchPage(
        page: current.page,
        search: current.searchQuery,
        status: current.statusFilter,
        newQuery: current.searchQuery,
        newStatus: current.statusFilter,
      );
    } else {
      await load();
    }
  }

  // ── Vendor actions ────────────────────────────────────────────────────────

  /// Approves a PENDING or REJECTED vendor.
  /// Returns null on success, error message on failure.
  Future<String?> approveVendor(VendorModel vendor) =>
      _runAction(vendor, 'APPROVED', _repository.approveVendor);

  /// Rejects a PENDING vendor.
  /// Returns null on success, error message on failure.
  Future<String?> rejectVendor(VendorModel vendor) =>
      _runAction(vendor, 'REJECTED', _repository.rejectVendor);

  /// Suspends an APPROVED vendor.
  /// Returns null on success, error message on failure.
  Future<String?> suspendVendor(VendorModel vendor) =>
      _runAction(vendor, 'SUSPENDED', _repository.suspendVendor);

  // ── Private helpers ───────────────────────────────────────────────────────

  /// Shared page-fetch helper — sets isRefreshing, fetches, updates state.
  /// [newQuery] and [newStatus] are applied on success (allows in-flight discard
  /// if the user changes filters again before this call resolves).
  Future<String?> _fetchPage({
    required int page,
    required String? search,
    required String? status,
    required String newQuery,
    required String? newStatus,
  }) async {
    final current = state;
    if (current is! VendorLoaded) return null;

    emit(current.copyWith(isRefreshing: true));
    try {
      final result = await _repository.listVendors(
        page: page,
        limit: VendorLoaded.pageLimit,
        status: status,
        search: search,
      );
      // Guard: discard if state changed while the call was in flight.
      final s = state;
      if (s is! VendorLoaded) return null;
      emit(s.copyWith(
        items: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        searchQuery: newQuery,
        statusFilter: newStatus,
        clearStatusFilter: newStatus == null,
        isRefreshing: false,
      ));
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is VendorLoaded) emit(s.copyWith(isRefreshing: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is VendorLoaded) emit(s.copyWith(isRefreshing: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Shared action runner — adds id to actioningIds, calls API, optimistic
  /// status update on success, removes from actioningIds either way.
  Future<String?> _runAction(
    VendorModel vendor,
    String newStatus,
    Future<void> Function(String) apiCall,
  ) async {
    final current = state;
    if (current is! VendorLoaded) return null;
    // Prevent double-dispatch for the same vendor.
    if (current.actioningIds.contains(vendor.id)) return null;

    emit(current.copyWith(
      actioningIds: {...current.actioningIds, vendor.id},
    ));

    try {
      await apiCall(vendor.id);

      // Stale-state guard.
      final updated = state;
      if (updated is! VendorLoaded) return null;

      final newItems = updated.items.map((v) {
        return v.id == vendor.id ? v.copyWith(status: newStatus) : v;
      }).toList();
      final newActioning = Set<String>.from(updated.actioningIds)
        ..remove(vendor.id);

      emit(updated.copyWith(items: newItems, actioningIds: newActioning));
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is VendorLoaded) {
        final newActioning = Set<String>.from(s.actioningIds)
          ..remove(vendor.id);
        emit(s.copyWith(actioningIds: newActioning));
      }
      return e.message;
    } catch (_) {
      final s = state;
      if (s is VendorLoaded) {
        final newActioning = Set<String>.from(s.actioningIds)
          ..remove(vendor.id);
        emit(s.copyWith(actioningIds: newActioning));
      }
      return 'Something went wrong. Please try again.';
    }
  }
}
