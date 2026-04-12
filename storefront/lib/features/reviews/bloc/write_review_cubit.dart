import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../repositories/review_repository.dart';
import '../../../shared/models/review_model.dart';
import 'write_review_state.dart';

class WriteReviewCubit extends Cubit<WriteReviewState> {
  final ReviewRepository _repository;
  final String productId;

  WriteReviewCubit({
    required ReviewRepository repository,
    required this.productId,
    ReviewModel? existingReview,
  })  : _repository = repository,
        super(WriteReviewInitial(existingReview: existingReview));

  /// Submit a new review or update an existing one.
  Future<void> submit({
    required int rating,
    String? comment,
    String? existingReviewId,
  }) async {
    emit(const WriteReviewSubmitting());

    try {
      final ReviewModel result;
      if (existingReviewId != null) {
        result = await _repository.updateReview(
          reviewId: existingReviewId,
          rating: rating,
          comment: comment,
        );
      } else {
        result = await _repository.createReview(
          productId: productId,
          rating: rating,
          comment: comment,
        );
      }
      emit(WriteReviewSuccess(result));
    } catch (e) {
      emit(WriteReviewError(e.toString()));
    }
  }

  /// Delete an existing review.
  Future<void> deleteReview(String reviewId) async {
    emit(const WriteReviewSubmitting());

    try {
      await _repository.deleteReview(reviewId);
      emit(WriteReviewDeleted(reviewId));
    } catch (e) {
      emit(WriteReviewError(e.toString()));
    }
  }
}
