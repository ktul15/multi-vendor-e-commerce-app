import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/product_moderation_repository.dart';
import '../models/admin_product_model.dart';
import 'product_moderation_state.dart';

class ProductModerationCubit extends Cubit<ProductModerationState> {
  final ProductModerationRepository _repository;

  ProductModerationCubit({required ProductModerationRepository repository})
      : _repository = repository,
        super(const ProductModerationInitial());

  // ── Initial load ──────────────────────────────────────────────────────────

  Future<void> load() async {
    emit(const ProductModerationLoading());
    try {
      final result = await _repository.listProducts(
        page: 1,
        limit: ProductModerationLoaded.pageLimit,
      );
      emit(ProductModerationLoaded(
        items: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      ));
    } on ApiException catch (e) {
      emit(ProductModerationError(e.message));
    } catch (_) {
      emit(const ProductModerationError('Something went wrong. Please try again.'));
    }
  }

  /// Loads only if not already loaded or loading.
  /// Safe to call on every route rebuild.
  Future<void> ensureLoaded() async {
    if (state is ProductModerationLoaded || state is ProductModerationLoading) {
      return;
    }
    await load();
  }

  // ── Filter / search / page ────────────────────────────────────────────────

  /// Called after debounce in the search field. Resets to page 1.
  /// Returns an error message on failure, null on success.
  Future<String?> search(String query) async {
    final current = state;
    if (current is! ProductModerationLoaded) return null;
    if (current.searchQuery == query) return null;
    return _fetchPage(
      page: 1,
      search: query,
      isActive: current.statusFilter,
      newQuery: query,
      newStatus: current.statusFilter,
    );
  }

  /// Called when a status chip is tapped. null = "All". Resets to page 1.
  /// Returns an error message on failure, null on success.
  Future<String?> filterByStatus(bool? isActive) async {
    final current = state;
    if (current is! ProductModerationLoaded) return null;
    if (current.statusFilter == isActive) return null;
    return _fetchPage(
      page: 1,
      search: current.searchQuery,
      isActive: isActive,
      newQuery: current.searchQuery,
      newStatus: isActive,
    );
  }

  /// Navigate to the next page. Returns error message on failure, null on success.
  Future<String?> nextPage() async {
    final current = state;
    if (current is! ProductModerationLoaded || !current.hasNextPage) return null;
    return _fetchPage(
      page: current.page + 1,
      search: current.searchQuery,
      isActive: current.statusFilter,
      newQuery: current.searchQuery,
      newStatus: current.statusFilter,
    );
  }

  /// Navigate to the previous page. Returns error message on failure, null on success.
  Future<String?> prevPage() async {
    final current = state;
    if (current is! ProductModerationLoaded || !current.hasPrevPage) return null;
    return _fetchPage(
      page: current.page - 1,
      search: current.searchQuery,
      isActive: current.statusFilter,
      newQuery: current.searchQuery,
      newStatus: current.statusFilter,
    );
  }

  /// Reload the current page with the current filters.
  Future<void> refresh() async {
    final current = state;
    if (current is ProductModerationLoaded) {
      await _fetchPage(
        page: current.page,
        search: current.searchQuery,
        isActive: current.statusFilter,
        newQuery: current.searchQuery,
        newStatus: current.statusFilter,
      );
    } else {
      await load();
    }
  }

  // ── Product actions ───────────────────────────────────────────────────────

  /// Activates an inactive product.
  /// Returns null on success, error message on failure.
  Future<String?> activateProduct(AdminProductModel product) =>
      _runAction(
        product,
        apiCall: _repository.activateProduct,
        onSuccess: (updated, id) {
          final newItems = updated.items
              .map((p) => p.id == id ? p.copyWith(isActive: true) : p)
              .toList();
          final newActioning = Set<String>.from(updated.actioningIds)
            ..remove(id);
          return updated.copyWith(items: newItems, actioningIds: newActioning);
        },
      );

  /// Deactivates (flags) an active product.
  /// Returns null on success, error message on failure.
  Future<String?> deactivateProduct(AdminProductModel product) =>
      _runAction(
        product,
        apiCall: _repository.deactivateProduct,
        onSuccess: (updated, id) {
          final newItems = updated.items
              .map((p) => p.id == id ? p.copyWith(isActive: false) : p)
              .toList();
          final newActioning = Set<String>.from(updated.actioningIds)
            ..remove(id);
          return updated.copyWith(items: newItems, actioningIds: newActioning);
        },
      );

  /// Deletes a product, removes it from the list, and navigates to the
  /// previous page if the current page becomes empty.
  /// Returns null on success, error message on failure.
  Future<String?> deleteProduct(AdminProductModel product) async {
    final error = await _runAction(
      product,
      apiCall: _repository.deleteProduct,
      onSuccess: (updated, id) {
        final newItems =
            updated.items.where((p) => p.id != id).toList();
        final newActioning = Set<String>.from(updated.actioningIds)
          ..remove(id);
        return updated.copyWith(
          items: newItems,
          total: updated.total - 1,
          actioningIds: newActioning,
        );
      },
    );
    if (error != null) return error;

    // If the page is now empty and we are not on page 1, load the previous page.
    final current = state;
    if (current is ProductModerationLoaded &&
        current.items.isEmpty &&
        current.page > 1) {
      return _fetchPage(
        page: current.page - 1,
        search: current.searchQuery,
        isActive: current.statusFilter,
        newQuery: current.searchQuery,
        newStatus: current.statusFilter,
      );
    }
    return null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /// Shared page-fetch helper — sets isRefreshing, fetches, updates state.
  Future<String?> _fetchPage({
    required int page,
    required String search,
    required bool? isActive,
    required String newQuery,
    required bool? newStatus,
  }) async {
    final current = state;
    if (current is! ProductModerationLoaded) return null;

    emit(current.copyWith(isRefreshing: true));
    try {
      final result = await _repository.listProducts(
        page: page,
        limit: ProductModerationLoaded.pageLimit,
        isActive: isActive,
        search: search,
      );
      // Guard: discard if state changed while the call was in flight.
      final s = state;
      if (s is! ProductModerationLoaded) return null;
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
      if (s is ProductModerationLoaded) emit(s.copyWith(isRefreshing: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is ProductModerationLoaded) emit(s.copyWith(isRefreshing: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Shared action runner — adds id to actioningIds, calls API, applies
  /// [onSuccess] to compute the new state, removes from actioningIds on error.
  Future<String?> _runAction(
    AdminProductModel product, {
    required Future<void> Function(String) apiCall,
    required ProductModerationLoaded Function(
            ProductModerationLoaded updated, String id)
        onSuccess,
  }) async {
    final current = state;
    if (current is! ProductModerationLoaded) return null;
    // Prevent double-dispatch for the same product.
    if (current.actioningIds.contains(product.id)) return null;

    emit(current.copyWith(
      actioningIds: {...current.actioningIds, product.id},
    ));

    try {
      await apiCall(product.id);

      // Stale-state guard.
      final updated = state;
      if (updated is! ProductModerationLoaded) return null;

      emit(onSuccess(updated, product.id));
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is ProductModerationLoaded) {
        final newActioning = Set<String>.from(s.actioningIds)
          ..remove(product.id);
        emit(s.copyWith(actioningIds: newActioning));
      }
      return e.message;
    } catch (_) {
      final s = state;
      if (s is ProductModerationLoaded) {
        final newActioning = Set<String>.from(s.actioningIds)
          ..remove(product.id);
        emit(s.copyWith(actioningIds: newActioning));
      }
      return 'Something went wrong. Please try again.';
    }
  }
}
