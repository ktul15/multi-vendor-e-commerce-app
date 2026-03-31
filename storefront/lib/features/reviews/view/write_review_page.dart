import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../repositories/review_repository.dart';
import '../../../shared/models/review_model.dart';
import '../bloc/write_review_cubit.dart';
import '../bloc/write_review_state.dart';
import '../widgets/star_rating_input.dart';

class WriteReviewPage extends StatefulWidget {
  final String productId;
  final ReviewModel? existingReview;

  const WriteReviewPage({
    super.key,
    required this.productId,
    this.existingReview,
  });

  @override
  State<WriteReviewPage> createState() => _WriteReviewPageState();
}

class _WriteReviewPageState extends State<WriteReviewPage> {
  late final WriteReviewCubit _cubit;
  late final TextEditingController _commentController;
  int _rating = 0;

  bool get _isEditing => widget.existingReview != null;

  @override
  void initState() {
    super.initState();
    _cubit = WriteReviewCubit(
      repository: sl<ReviewRepository>(),
      productId: widget.productId,
      existingReview: widget.existingReview,
    );
    _commentController = TextEditingController(
      text: widget.existingReview?.comment ?? '',
    );
    _rating = widget.existingReview?.rating ?? 0;
  }

  @override
  void dispose() {
    _commentController.dispose();
    _cubit.close();
    super.dispose();
  }

  void _submit() {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a rating')),
      );
      return;
    }

    final comment = _commentController.text.trim();
    _cubit.submit(
      rating: _rating,
      comment: comment.isEmpty ? null : comment,
      existingReviewId: widget.existingReview?.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocListener<WriteReviewCubit, WriteReviewState>(
        listener: (context, state) {
          if (state is WriteReviewSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  _isEditing ? 'Review updated' : 'Review submitted',
                ),
              ),
            );
            context.pop(true);
          } else if (state is WriteReviewDeleted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Review deleted')),
            );
            context.pop(true);
          } else if (state is WriteReviewError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        child: Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: Text(_isEditing ? 'Edit Review' : 'Write a Review'),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.base),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Rating section
                Text('Your Rating', style: AppTextStyles.h5),
                const SizedBox(height: AppSpacing.md),
                Center(
                  child: StarRatingInput(
                    rating: _rating,
                    onChanged: (value) => setState(() => _rating = value),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Center(
                  child: Text(
                    _ratingLabel(_rating),
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),

                // Comment section
                Text('Your Review (optional)', style: AppTextStyles.h5),
                const SizedBox(height: AppSpacing.md),
                TextField(
                  controller: _commentController,
                  maxLines: 5,
                  maxLength: 1000,
                  decoration: InputDecoration(
                    hintText: 'Share your experience with this product...',
                    hintStyle: AppTextStyles.body.copyWith(
                      color: AppColors.textSecondary.withAlpha(128),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      borderSide: const BorderSide(
                        color: AppColors.primary,
                        width: 2,
                      ),
                    ),
                    contentPadding: const EdgeInsets.all(AppSpacing.base),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),

                // Submit button
                BlocBuilder<WriteReviewCubit, WriteReviewState>(
                  builder: (context, state) {
                    final isSubmitting = state is WriteReviewSubmitting;
                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSubmitting ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.md,
                          ),
                        ),
                        child: isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                _isEditing
                                    ? 'Update Review'
                                    : 'Submit Review',
                              ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _ratingLabel(int rating) {
    return switch (rating) {
      1 => 'Poor',
      2 => 'Fair',
      3 => 'Good',
      4 => 'Very Good',
      5 => 'Excellent',
      _ => 'Tap to rate',
    };
  }
}
