import 'package:equatable/equatable.dart';
import '../models/admin_product_model.dart';

sealed class ProductModerationState extends Equatable {
  const ProductModerationState();

  @override
  List<Object?> get props => [];
}

class ProductModerationInitial extends ProductModerationState {
  const ProductModerationInitial();
}

class ProductModerationLoading extends ProductModerationState {
  const ProductModerationLoading();
}

class ProductModerationLoaded extends ProductModerationState {
  static const int pageLimit = 15;

  final List<AdminProductModel> items;
  final int total;
  final int page;
  final int totalPages;
  final String searchQuery;
  final bool? statusFilter; // null = All, true = Active, false = Inactive
  // True while a page-change / search / filter fetch is in flight.
  // Keeps the existing table visible with a loading overlay.
  final bool isRefreshing;
  // IDs of products with an in-flight activate/deactivate/delete call.
  final Set<String> actioningIds;

  const ProductModerationLoaded({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    this.searchQuery = '',
    this.statusFilter,
    this.isRefreshing = false,
    this.actioningIds = const {},
  });

  bool get hasNextPage => page < totalPages;
  bool get hasPrevPage => page > 1;

  int get fromItem => total == 0 ? 0 : ((page - 1) * pageLimit) + 1;
  int get toItem => total == 0 ? 0 : (page * pageLimit).clamp(0, total);

  ProductModerationLoaded copyWith({
    List<AdminProductModel>? items,
    int? total,
    int? page,
    int? totalPages,
    String? searchQuery,
    bool? statusFilter,
    bool? isRefreshing,
    Set<String>? actioningIds,
    bool clearStatusFilter = false,
  }) {
    return ProductModerationLoaded(
      items: items ?? this.items,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      searchQuery: searchQuery ?? this.searchQuery,
      statusFilter:
          clearStatusFilter ? null : (statusFilter ?? this.statusFilter),
      isRefreshing: isRefreshing ?? this.isRefreshing,
      // Always wrap in Set.from so Equatable detects the change.
      actioningIds: Set.from(actioningIds ?? this.actioningIds),
    );
  }

  @override
  List<Object?> get props => [
        items,
        total,
        page,
        totalPages,
        searchQuery,
        statusFilter,
        isRefreshing,
        // toList()..sort() so Equatable compares contents, not set identity.
        actioningIds.toList()..sort(),
      ];
}

class ProductModerationError extends ProductModerationState {
  final String message;

  const ProductModerationError(this.message);

  @override
  List<Object?> get props => [message];
}
