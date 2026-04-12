import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/promo_repository.dart';
import 'promo_state.dart';

class PromoCubit extends Cubit<PromoState> {
  final PromoRepository _repository;

  PromoCubit({required PromoRepository repository})
      : _repository = repository,
        super(const PromoInitial());

  // ── Initial load ──────────────────────────────────────────────────────────

  Future<void> load() async {
    emit(const PromoLoading());
    try {
      final result = await _repository.listPromos(
        page: 1,
        limit: PromoLoaded.pageLimit,
      );
      emit(PromoLoaded(items: result.items, meta: result.meta));
    } on ApiException catch (e) {
      emit(PromoError(e.message));
    } catch (_) {
      emit(const PromoError('Something went wrong. Please try again.'));
    }
  }

  /// Loads only if not already loaded or loading. Safe to call on every route rebuild.
  Future<void> ensureLoaded() async {
    if (state is PromoLoaded || state is PromoLoading) return;
    await load();
  }

  // ── Filter / page ──────────────────────────────────────────────────────────

  Future<String?> filterByActive(bool? isActive) async {
    final current = state;
    if (current is! PromoLoaded) return null;
    if (current.isActiveFilter == isActive) return null;
    return _fetchPage(
      page: 1,
      isActive: isActive,
      search: current.searchQuery,
      discountType: current.discountTypeFilter,
      newIsActive: isActive,
      newSearch: current.searchQuery,
      newDiscountType: current.discountTypeFilter,
    );
  }

  Future<String?> search(String? query) async {
    final current = state;
    if (current is! PromoLoaded) return null;
    final trimmed = query?.trim().isEmpty == true ? null : query?.trim();
    if (current.searchQuery == trimmed) return null;
    return _fetchPage(
      page: 1,
      isActive: current.isActiveFilter,
      search: trimmed,
      discountType: current.discountTypeFilter,
      newIsActive: current.isActiveFilter,
      newSearch: trimmed,
      newDiscountType: current.discountTypeFilter,
    );
  }

  Future<String?> filterByDiscountType(String? discountType) async {
    final current = state;
    if (current is! PromoLoaded) return null;
    if (current.discountTypeFilter == discountType) return null;
    return _fetchPage(
      page: 1,
      isActive: current.isActiveFilter,
      search: current.searchQuery,
      discountType: discountType,
      newIsActive: current.isActiveFilter,
      newSearch: current.searchQuery,
      newDiscountType: discountType,
    );
  }

  Future<String?> nextPage() async {
    final current = state;
    if (current is! PromoLoaded || !current.hasNextPage) return null;
    return _fetchPage(
      page: current.meta.page + 1,
      isActive: current.isActiveFilter,
      search: current.searchQuery,
      discountType: current.discountTypeFilter,
      newIsActive: current.isActiveFilter,
      newSearch: current.searchQuery,
      newDiscountType: current.discountTypeFilter,
    );
  }

  Future<String?> prevPage() async {
    final current = state;
    if (current is! PromoLoaded || !current.hasPrevPage) return null;
    return _fetchPage(
      page: current.meta.page - 1,
      isActive: current.isActiveFilter,
      search: current.searchQuery,
      discountType: current.discountTypeFilter,
      newIsActive: current.isActiveFilter,
      newSearch: current.searchQuery,
      newDiscountType: current.discountTypeFilter,
    );
  }

  Future<void> refresh() async {
    final current = state;
    if (current is PromoLoaded) {
      await _fetchPage(
        page: current.meta.page,
        isActive: current.isActiveFilter,
        search: current.searchQuery,
        discountType: current.discountTypeFilter,
        newIsActive: current.isActiveFilter,
        newSearch: current.searchQuery,
        newDiscountType: current.discountTypeFilter,
      );
    } else {
      await load();
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /// Creates a promo code. Returns null on success, error message on failure.
  Future<String?> createPromo({
    required String code,
    required String discountType,
    required double discountValue,
    double? minOrderValue,
    double? maxDiscount,
    int? usageLimit,
    int? perUserLimit,
    bool isActive = true,
    DateTime? expiresAt,
  }) async {
    final current = state;
    if (current is! PromoLoaded) return null;
    emit(current.copyWith(isSubmitting: true));
    try {
      await _repository.createPromo(
        code: code,
        discountType: discountType,
        discountValue: discountValue,
        minOrderValue: minOrderValue,
        maxDiscount: maxDiscount,
        usageLimit: usageLimit,
        perUserLimit: perUserLimit,
        isActive: isActive,
        expiresAt: expiresAt,
      );
      await _silentRefresh(current);
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isSubmitting: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isSubmitting: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Updates a promo code. Returns null on success, error message on failure.
  Future<String?> updatePromo(
    String id, {
    String? code,
    String? discountType,
    double? discountValue,
    double? minOrderValue,
    double? maxDiscount,
    int? usageLimit,
    int? perUserLimit,
    bool? isActive,
    DateTime? expiresAt,
    bool clearMinOrderValue = false,
    bool clearMaxDiscount = false,
    bool clearUsageLimit = false,
    bool clearPerUserLimit = false,
    bool clearExpiresAt = false,
  }) async {
    final current = state;
    if (current is! PromoLoaded) return null;
    emit(current.copyWith(isSubmitting: true));
    try {
      await _repository.updatePromo(
        id,
        code: code,
        discountType: discountType,
        discountValue: discountValue,
        minOrderValue: minOrderValue,
        maxDiscount: maxDiscount,
        usageLimit: usageLimit,
        perUserLimit: perUserLimit,
        isActive: isActive,
        expiresAt: expiresAt,
        clearMinOrderValue: clearMinOrderValue,
        clearMaxDiscount: clearMaxDiscount,
        clearUsageLimit: clearUsageLimit,
        clearPerUserLimit: clearPerUserLimit,
        clearExpiresAt: clearExpiresAt,
      );
      await _silentRefresh(current);
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isSubmitting: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isSubmitting: false));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Toggles the isActive flag for a promo. Returns null on success.
  Future<String?> togglePromo(String id, {required bool newIsActive}) async {
    final current = state;
    if (current is! PromoLoaded) return null;

    // Optimistic local update so the switch feels instant.
    final updatedItems = current.items
        .map((p) => p.id == id ? p.copyWith(isActive: newIsActive) : p)
        .toList();
    emit(current.copyWith(items: updatedItems));

    try {
      await _repository.updatePromo(id, isActive: newIsActive);
      return null;
    } on ApiException catch (e) {
      // Revert on failure.
      final revertedItems = updatedItems
          .map((p) => p.id == id ? p.copyWith(isActive: !newIsActive) : p)
          .toList();
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(items: revertedItems));
      return e.message;
    } catch (_) {
      final revertedItems = updatedItems
          .map((p) => p.id == id ? p.copyWith(isActive: !newIsActive) : p)
          .toList();
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(items: revertedItems));
      return 'Something went wrong. Please try again.';
    }
  }

  /// Deletes a promo code. Returns null on success, error message on failure.
  Future<String?> deletePromo(String id) async {
    final current = state;
    if (current is! PromoLoaded) return null;
    emit(current.copyWith(isSubmitting: true));
    try {
      await _repository.deletePromo(id);
      await _silentRefresh(current);
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isSubmitting: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isSubmitting: false));
      return 'Something went wrong. Please try again.';
    }
  }

  void clearTransientError() {
    final current = state;
    if (current is PromoLoaded) {
      emit(current.copyWith(clearTransientError: true));
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<String?> _fetchPage({
    required int page,
    required bool? isActive,
    required String? search,
    required String? discountType,
    required bool? newIsActive,
    required String? newSearch,
    required String? newDiscountType,
  }) async {
    final current = state;
    if (current is! PromoLoaded) return null;

    emit(current.copyWith(isRefreshing: true));
    try {
      final result = await _repository.listPromos(
        page: page,
        limit: PromoLoaded.pageLimit,
        isActive: isActive,
        search: search,
        discountType: discountType,
      );

      // Stale-state guard.
      final s = state;
      if (s is! PromoLoaded) return null;

      emit(s.copyWith(
        items: result.items,
        meta: result.meta,
        isActiveFilter: newIsActive,
        clearIsActiveFilter: newIsActive == null,
        searchQuery: newSearch,
        clearSearchQuery: newSearch == null,
        discountTypeFilter: newDiscountType,
        clearDiscountTypeFilter: newDiscountType == null,
        isRefreshing: false,
      ));
      return null;
    } on ApiException catch (e) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isRefreshing: false));
      return e.message;
    } catch (_) {
      final s = state;
      if (s is PromoLoaded) emit(s.copyWith(isRefreshing: false));
      return 'Something went wrong. Please try again.';
    }
  }

  Future<void> _silentRefresh(PromoLoaded previous) async {
    try {
      final result = await _repository.listPromos(
        page: previous.meta.page,
        limit: PromoLoaded.pageLimit,
        isActive: previous.isActiveFilter,
        search: previous.searchQuery,
        discountType: previous.discountTypeFilter,
      );
      final s = state;
      if (s is PromoLoaded) {
        emit(s.copyWith(
          items: result.items,
          meta: result.meta,
          isSubmitting: false,
        ));
      }
    } on ApiException catch (e) {
      final s = state;
      if (s is PromoLoaded) {
        emit(s.copyWith(isSubmitting: false, transientError: e.message));
      }
    } catch (_) {
      final s = state;
      if (s is PromoLoaded) {
        emit(s.copyWith(
          isSubmitting: false,
          transientError: 'Something went wrong. Please try again.',
        ));
      }
    }
  }
}
