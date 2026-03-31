import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/wishlist_repository.dart';
import 'wishlist_state.dart';

class WishlistCubit extends Cubit<WishlistState> {
  final WishlistRepository _repository;

  WishlistCubit({required WishlistRepository repository})
      : _repository = repository,
        super(const WishlistInitial());

  /// Load the first page of the wishlist.
  Future<void> loadWishlist() async {
    final current = state;
    if (current is WishlistLoaded && current.isLoading) return;

    if (current is WishlistLoaded) {
      emit(current.copyWith(isLoading: true, clearError: true));
    } else {
      emit(const WishlistLoaded(
        items: [],
        total: 0,
        isLoading: true,
        productIds: {},
      ));
    }

    try {
      final result = await _repository.getWishlist(page: 1);
      final ids = result.items.map((i) => i.productId).toSet();
      emit(WishlistLoaded(
        items: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        productIds: ids,
      ));
    } catch (e) {
      final s = state;
      if (s is WishlistLoaded) {
        emit(s.copyWith(isLoading: false, error: e.toString()));
      }
    }
  }

  /// Load the next page.
  Future<void> loadMore() async {
    final current = state;
    if (current is! WishlistLoaded) return;
    if (current.isLoadingMore || !current.hasMore) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final result = await _repository.getWishlist(page: nextPage);
      final newIds = result.items.map((i) => i.productId).toSet();
      emit(current.copyWith(
        items: [...current.items, ...result.items],
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isLoadingMore: false,
        productIds: {...current.productIds, ...newIds},
      ));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false, error: e.toString()));
    }
  }

  /// Toggle a product in the wishlist (optimistic).
  Future<void> toggleProduct(String productId) async {
    final current = state;
    if (current is! WishlistLoaded) {
      // Bootstrap a minimal loaded state so the heart icon updates.
      emit(WishlistLoaded(
        items: const [],
        total: 0,
        productIds: {productId},
      ));
      try {
        final action = await _repository.toggle(productId);
        final s = state;
        if (s is WishlistLoaded) {
          if (action == 'removed') {
            emit(s.copyWith(
              productIds: {...s.productIds}..remove(productId),
            ));
          }
        }
      } catch (_) {
        emit(const WishlistInitial());
      }
      return;
    }

    final wasInWishlist = current.productIds.contains(productId);

    // Optimistic update
    if (wasInWishlist) {
      final updated = current.items.where((i) => i.productId != productId).toList();
      emit(current.copyWith(
        items: updated,
        total: current.total - 1,
        productIds: {...current.productIds}..remove(productId),
      ));
    } else {
      emit(current.copyWith(
        productIds: {...current.productIds, productId},
      ));
    }

    try {
      await _repository.toggle(productId);
    } catch (_) {
      // Revert on failure
      emit(current);
    }
  }

  /// Remove a product from the wishlist (optimistic with revert on failure).
  /// Re-throws on API failure so callers (e.g. confirmDismiss) can react.
  Future<void> removeProduct(String productId) async {
    final current = state;
    if (current is! WishlistLoaded) return;

    final updated = current.items.where((i) => i.productId != productId).toList();
    emit(current.copyWith(
      items: updated,
      total: current.total - 1,
      productIds: {...current.productIds}..remove(productId),
    ));

    try {
      await _repository.remove(productId);
    } catch (e) {
      emit(current);
      rethrow;
    }
  }

  /// Check if a product is in the wishlist.
  bool isInWishlist(String productId) {
    final current = state;
    if (current is WishlistLoaded) {
      return current.productIds.contains(productId);
    }
    return false;
  }

  /// Reset state on logout.
  void reset() {
    emit(const WishlistInitial());
  }
}
