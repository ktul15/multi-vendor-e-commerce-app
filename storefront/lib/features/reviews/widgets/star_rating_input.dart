import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Interactive star rating input — tap to select 1–5 stars.
class StarRatingInput extends StatelessWidget {
  final int rating;
  final ValueChanged<int> onChanged;
  final double size;

  const StarRatingInput({
    super.key,
    required this.rating,
    required this.onChanged,
    this.size = 40,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final starValue = i + 1;
        return GestureDetector(
          onTap: () => onChanged(starValue),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Icon(
              starValue <= rating
                  ? Icons.star_rounded
                  : Icons.star_outline_rounded,
              size: size,
              color: starValue <= rating ? AppColors.rating : Colors.grey[300],
            ),
          ),
        );
      }),
    );
  }
}
