import 'package:equatable/equatable.dart';
import 'product_model.dart';

/// Sort options supported by the backend /products endpoint.
enum ProductSort {
  newest('newest', 'Newest'),
  popular('popular', 'Popular'),
  priceAsc('price_asc', 'Price: Low to High'),
  priceDesc('price_desc', 'Price: High to Low'),
  rating('rating', 'Top Rated');

  final String value;
  final String label;
  const ProductSort(this.value, this.label);

  static ProductSort fromValue(String value) =>
      ProductSort.values.firstWhere((s) => s.value == value,
          orElse: () => ProductSort.newest);
}

/// Immutable filter/sort state for the product listing.
class ProductFilters extends Equatable {
  final ProductSort sort;
  final double? minPrice;
  final double? maxPrice;
  final double? minRating;
  final bool? inStock;
  final String? categoryId;
  final String? vendorId;

  const ProductFilters({
    this.sort = ProductSort.newest,
    this.minPrice,
    this.maxPrice,
    this.minRating,
    this.inStock,
    this.categoryId,
    this.vendorId,
  });

  /// Intentionally excludes [categoryId] and [vendorId] — these are set by
  /// the navigation context (e.g. tapping a category tile) and are not
  /// considered "user-applied" filters for badge/reset purposes.
  bool get hasActiveFilters =>
      minPrice != null ||
      maxPrice != null ||
      minRating != null ||
      inStock != null;

  /// Same exclusion rationale as [hasActiveFilters].
  int get activeFilterCount => [
        minPrice,
        maxPrice,
        minRating,
        inStock,
      ].where((f) => f != null).length;

  ProductFilters copyWith({
    ProductSort? sort,
    double? minPrice,
    double? maxPrice,
    double? minRating,
    bool? inStock,
    String? categoryId,
    String? vendorId,
    bool clearMinPrice = false,
    bool clearMaxPrice = false,
    bool clearMinRating = false,
    bool clearInStock = false,
  }) {
    return ProductFilters(
      sort: sort ?? this.sort,
      minPrice: clearMinPrice ? null : (minPrice ?? this.minPrice),
      maxPrice: clearMaxPrice ? null : (maxPrice ?? this.maxPrice),
      minRating: clearMinRating ? null : (minRating ?? this.minRating),
      inStock: clearInStock ? null : (inStock ?? this.inStock),
      categoryId: categoryId ?? this.categoryId,
      vendorId: vendorId ?? this.vendorId,
    );
  }

  /// Returns a fresh filters object with only the categoryId/vendorId preserved.
  ProductFilters resetFilters() => ProductFilters(
        sort: sort,
        categoryId: categoryId,
        vendorId: vendorId,
      );

  Map<String, dynamic> toQueryParams(int page, int limit) {
    return {
      'page': page,
      'limit': limit,
      'sort': sort.value,
      if (minPrice != null) 'minPrice': minPrice,
      if (maxPrice != null) 'maxPrice': maxPrice,
      if (minRating != null) 'rating': minRating,
      if (inStock != null) 'inStock': inStock,
      if (categoryId != null) 'categoryId': categoryId,
      if (vendorId != null) 'vendorId': vendorId,
    };
  }

  @override
  List<Object?> get props =>
      [sort, minPrice, maxPrice, minRating, inStock, categoryId, vendorId];
}

/// Pagination metadata from the API.
class ProductsPage extends Equatable {
  final List<ProductModel> items;
  final int total;
  final int page;
  final int totalPages;

  const ProductsPage({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });

  bool get hasMore => page < totalPages;

  @override
  List<Object?> get props => [items, total, page, totalPages];
}
