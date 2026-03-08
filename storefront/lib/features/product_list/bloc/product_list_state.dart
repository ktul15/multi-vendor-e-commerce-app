import 'package:equatable/equatable.dart';
import '../../../shared/models/product_filters.dart';
import '../../../shared/models/product_model.dart';

enum ProductListViewMode { grid, list }

sealed class ProductListState extends Equatable {
  const ProductListState();

  @override
  List<Object?> get props => [];
}

class ProductListInitial extends ProductListState {
  const ProductListInitial();
}

class ProductListLoading extends ProductListState {
  const ProductListLoading();
}

class ProductListLoaded extends ProductListState {
  final List<ProductModel> products;
  final int total;
  final int currentPage;
  final int totalPages;
  final ProductFilters filters;
  final ProductListViewMode viewMode;
  final bool isLoadingMore;

  const ProductListLoaded({
    required this.products,
    required this.total,
    required this.currentPage,
    required this.totalPages,
    required this.filters,
    this.viewMode = ProductListViewMode.grid,
    this.isLoadingMore = false,
  });

  bool get hasMore => currentPage < totalPages;

  ProductListLoaded copyWith({
    List<ProductModel>? products,
    int? total,
    int? currentPage,
    int? totalPages,
    ProductFilters? filters,
    ProductListViewMode? viewMode,
    bool? isLoadingMore,
  }) {
    return ProductListLoaded(
      products: products ?? this.products,
      total: total ?? this.total,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      filters: filters ?? this.filters,
      viewMode: viewMode ?? this.viewMode,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [
        products,
        total,
        currentPage,
        totalPages,
        filters,
        viewMode,
        isLoadingMore,
      ];
}

class ProductListError extends ProductListState {
  final String message;
  final ProductFilters filters;

  const ProductListError({required this.message, required this.filters});

  @override
  List<Object?> get props => [message, filters];
}
