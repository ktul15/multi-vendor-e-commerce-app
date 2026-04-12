import 'package:equatable/equatable.dart';
import '../../../shared/models/wishlist_model.dart';

sealed class WishlistState extends Equatable {
  const WishlistState();
}

class WishlistInitial extends WishlistState {
  const WishlistInitial();

  @override
  List<Object?> get props => [];
}

class WishlistLoaded extends WishlistState {
  final List<WishlistItemModel> items;
  final int total;
  final int page;
  final int totalPages;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;

  /// Set of product IDs currently in the wishlist (for quick lookup).
  final Set<String> productIds;

  const WishlistLoaded({
    required this.items,
    required this.total,
    this.page = 1,
    this.totalPages = 1,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    required this.productIds,
  });

  bool get hasMore => page < totalPages;

  bool isInWishlist(String productId) => productIds.contains(productId);

  WishlistLoaded copyWith({
    List<WishlistItemModel>? items,
    int? total,
    int? page,
    int? totalPages,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    Set<String>? productIds,
    bool clearError = false,
  }) {
    return WishlistLoaded(
      items: items ?? this.items,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: clearError ? null : (error ?? this.error),
      productIds: productIds ?? this.productIds,
    );
  }

  @override
  List<Object?> get props => [
        items,
        total,
        page,
        totalPages,
        isLoading,
        isLoadingMore,
        error,
        productIds,
      ];
}
