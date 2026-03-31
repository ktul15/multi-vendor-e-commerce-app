import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import 'star_rating_display.dart';

/// Displays a star-rating breakdown bar chart (5 → 1) with average and total.
class RatingBreakdown extends StatelessWidget {
  final double avgRating;
  final int totalReviews;
  final Map<int, int> ratingCounts;
  final int? selectedRating;
  final ValueChanged<int?> onRatingTap;
  final bool isApproximate;

  const RatingBreakdown({
    super.key,
    required this.avgRating,
    required this.totalReviews,
    required this.ratingCounts,
    this.selectedRating,
    required this.onRatingTap,
    this.isApproximate = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left: average + stars
        Column(
          children: [
            Text(
              avgRating.toStringAsFixed(1),
              style: AppTextStyles.h1.copyWith(
                color: AppColors.textPrimary,
                fontSize: 40,
              ),
            ),
            StarRatingDisplay(rating: avgRating, size: 16),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '$totalReviews reviews',
              style: AppTextStyles.caption,
            ),
          ],
        ),
        const SizedBox(width: AppSpacing.xl),
        // Right: bar chart
        Expanded(
          child: Column(
            children: List.generate(5, (i) {
              final star = 5 - i;
              final count = ratingCounts[star] ?? 0;
              final fraction =
                  totalReviews > 0 ? count / totalReviews : 0.0;
              final isSelected = selectedRating == star;

              return GestureDetector(
                onTap: () => onRatingTap(isSelected ? null : star),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Text(
                        '$star',
                        style: AppTextStyles.caption.copyWith(
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Icon(
                        Icons.star_rounded,
                        size: 12,
                        color: isSelected ? AppColors.primary : AppColors.rating,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppSpacing.xs),
                          child: LinearProgressIndicator(
                            value: fraction,
                            minHeight: 6,
                            backgroundColor: isSelected
                                ? AppColors.primary.withAlpha(30)
                                : Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation(
                              isSelected ? AppColors.primary : AppColors.rating,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      SizedBox(
                        width: 28,
                        child: Text(
                          '$count',
                          style: AppTextStyles.caption.copyWith(
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: isSelected
                                ? AppColors.primary
                                : AppColors.textSecondary,
                          ),
                          textAlign: TextAlign.end,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ],
    );
  }
}
