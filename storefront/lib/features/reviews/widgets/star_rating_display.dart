import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Read-only star rating display — shows filled, half, and outline stars.
class StarRatingDisplay extends StatelessWidget {
  final double rating;
  final double size;

  const StarRatingDisplay({
    super.key,
    required this.rating,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final starIndex = i + 1;
        if (rating >= starIndex) {
          return Icon(Icons.star_rounded, size: size, color: AppColors.rating);
        } else if (rating >= starIndex - 0.5) {
          return Icon(Icons.star_half_rounded,
              size: size, color: AppColors.rating);
        }
        return Icon(Icons.star_outline_rounded,
            size: size, color: Colors.grey[300]);
      }),
    );
  }
}
