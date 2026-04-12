import 'package:equatable/equatable.dart';
import '../../../shared/models/review_model.dart';

sealed class ReviewListState extends Equatable {
  const ReviewListState();
}

class ReviewListInitial extends ReviewListState {
  const ReviewListInitial();

  @override
  List<Object?> get props => [];
}

class ReviewListLoaded extends ReviewListState {
  final List<ReviewModel> reviews;
  final int total;
  final int page;
  final int totalPages;
  final bool isLoading;
  final bool isLoadingMore;
  final String? error;
  final int? filterRating;
  final String sort;

  const ReviewListLoaded({
    required this.reviews,
    required this.total,
    this.page = 1,
    this.totalPages = 1,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.filterRating,
    this.sort = 'newest',
  });

  bool get hasMore => page < totalPages;

  /// Rating breakdown from loaded reviews. Approximate when not all pages
  /// are loaded — counts reflect only the reviews fetched so far.
  Map<int, int> get ratingCounts {
    final counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    for (final review in reviews) {
      counts[review.rating] = (counts[review.rating] ?? 0) + 1;
    }
    return counts;
  }

  /// Whether all reviews have been loaded (breakdown is accurate).
  bool get isBreakdownComplete => !hasMore && !isLoading;

  ReviewListLoaded copyWith({
    List<ReviewModel>? reviews,
    int? total,
    int? page,
    int? totalPages,
    bool? isLoading,
    bool? isLoadingMore,
    String? error,
    int? filterRating,
    String? sort,
    bool clearError = false,
    bool clearFilter = false,
  }) {
    return ReviewListLoaded(
      reviews: reviews ?? this.reviews,
      total: total ?? this.total,
      page: page ?? this.page,
      totalPages: totalPages ?? this.totalPages,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: clearError ? null : (error ?? this.error),
      filterRating: clearFilter ? null : (filterRating ?? this.filterRating),
      sort: sort ?? this.sort,
    );
  }

  @override
  List<Object?> get props => [
        reviews,
        total,
        page,
        totalPages,
        isLoading,
        isLoadingMore,
        error,
        filterRating,
        sort,
      ];
}
