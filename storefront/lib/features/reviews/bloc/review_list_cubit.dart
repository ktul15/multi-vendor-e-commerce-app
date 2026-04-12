import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/review_repository.dart';
import 'review_list_state.dart';

class ReviewListCubit extends Cubit<ReviewListState> {
  final ReviewRepository _repository;
  final String productId;

  ReviewListCubit({
    required ReviewRepository repository,
    required this.productId,
  })  : _repository = repository,
        super(const ReviewListInitial());

  /// Load the first page of reviews.
  Future<void> loadReviews() async {
    final current = state;
    if (current is ReviewListLoaded && current.isLoading) return;

    final sort = current is ReviewListLoaded ? current.sort : 'newest';
    final filterRating =
        current is ReviewListLoaded ? current.filterRating : null;

    if (current is ReviewListLoaded) {
      emit(current.copyWith(isLoading: true, clearError: true));
    } else {
      emit(const ReviewListLoaded(
        reviews: [],
        total: 0,
        isLoading: true,
      ));
    }

    try {
      final result = await _repository.getProductReviews(
        productId: productId,
        page: 1,
        rating: filterRating,
        sort: sort,
      );
      emit(ReviewListLoaded(
        reviews: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        filterRating: filterRating,
        sort: sort,
      ));
    } catch (e) {
      final s = state;
      if (s is ReviewListLoaded) {
        emit(s.copyWith(isLoading: false, error: e.toString()));
      }
    }
  }

  /// Load the next page.
  Future<void> loadMore() async {
    final current = state;
    if (current is! ReviewListLoaded) return;
    if (current.isLoadingMore || !current.hasMore) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final result = await _repository.getProductReviews(
        productId: productId,
        page: nextPage,
        rating: current.filterRating,
        sort: current.sort,
      );
      emit(current.copyWith(
        reviews: [...current.reviews, ...result.items],
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        isLoadingMore: false,
      ));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false, error: e.toString()));
    }
  }

  /// Filter by star rating (null = all).
  Future<void> filterByRating(int? rating) async {
    final current = state;
    if (current is! ReviewListLoaded) return;

    if (rating == current.filterRating) {
      emit(current.copyWith(clearFilter: true));
    } else {
      emit(current.copyWith(filterRating: rating));
    }
    await loadReviews();
  }

  /// Change sort order.
  Future<void> changeSort(String sort) async {
    final current = state;
    if (current is! ReviewListLoaded) return;
    if (sort == current.sort) return;

    emit(current.copyWith(sort: sort));
    await loadReviews();
  }

  /// Remove a review from the local list (after deletion).
  void removeReview(String reviewId) {
    final current = state;
    if (current is! ReviewListLoaded) return;

    final updated = current.reviews.where((r) => r.id != reviewId).toList();
    emit(current.copyWith(reviews: updated, total: current.total - 1));
  }
}
