import 'package:equatable/equatable.dart';
import '../../../shared/models/product_model.dart';

sealed class SearchState extends Equatable {
  /// Recent searches are carried in every state so the UI can always access
  /// them without needing a separate stream.
  final List<String> recentSearches;

  const SearchState({this.recentSearches = const []});
}

/// No active query — show recent searches.
class SearchIdle extends SearchState {
  const SearchIdle({super.recentSearches});

  @override
  List<Object?> get props => [recentSearches];
}

/// Debounce has fired; network request is in flight.
class SearchLoading extends SearchState {
  final String query;

  const SearchLoading({required this.query, super.recentSearches});

  @override
  List<Object?> get props => [query, recentSearches];
}

/// Results received (may be empty).
class SearchLoaded extends SearchState {
  final String query;
  final List<ProductModel> products;
  final int total;
  final int currentPage;
  final int totalPages;
  final bool isLoadingMore;

  const SearchLoaded({
    required this.query,
    required this.products,
    required this.total,
    required this.currentPage,
    required this.totalPages,
    this.isLoadingMore = false,
    super.recentSearches,
  });

  bool get hasMore => currentPage < totalPages;

  SearchLoaded copyWith({
    List<ProductModel>? products,
    int? total,
    int? currentPage,
    int? totalPages,
    bool? isLoadingMore,
    List<String>? recentSearches,
  }) {
    return SearchLoaded(
      query: query,
      products: products ?? this.products,
      total: total ?? this.total,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      recentSearches: recentSearches ?? this.recentSearches,
    );
  }

  @override
  List<Object?> get props => [
        query,
        products,
        total,
        currentPage,
        totalPages,
        isLoadingMore,
        recentSearches,
      ];
}

/// Search request failed.
class SearchError extends SearchState {
  final String query;
  final String message;

  const SearchError({
    required this.query,
    required this.message,
    super.recentSearches,
  });

  @override
  List<Object?> get props => [query, message, recentSearches];
}
