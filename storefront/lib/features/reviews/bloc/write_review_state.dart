import 'package:equatable/equatable.dart';
import '../../../shared/models/review_model.dart';

sealed class WriteReviewState extends Equatable {
  const WriteReviewState();
}

class WriteReviewInitial extends WriteReviewState {
  /// Pre-populated when editing an existing review.
  final ReviewModel? existingReview;

  const WriteReviewInitial({this.existingReview});

  @override
  List<Object?> get props => [existingReview];
}

class WriteReviewSubmitting extends WriteReviewState {
  const WriteReviewSubmitting();

  @override
  List<Object?> get props => [];
}

class WriteReviewSuccess extends WriteReviewState {
  final ReviewModel review;

  const WriteReviewSuccess(this.review);

  @override
  List<Object?> get props => [review];
}

class WriteReviewDeleted extends WriteReviewState {
  final String reviewId;

  const WriteReviewDeleted(this.reviewId);

  @override
  List<Object?> get props => [reviewId];
}

class WriteReviewError extends WriteReviewState {
  final String message;

  const WriteReviewError(this.message);

  @override
  List<Object?> get props => [message];
}
