import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_dimensions.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/category_model.dart';

/// A single category tile used inside a [SliverGrid] on the home screen.
class CategoryTile extends StatelessWidget {
  final CategoryModel category;

  const CategoryTile({super.key, required this.category});

  static const _iconColors = [
    Color(0xFF6C63FF),
    Color(0xFFFF6584),
    Color(0xFF10B981),
    Color(0xFFF59E0B),
    Color(0xFF3B82F6),
    Color(0xFFEC4899),
    Color(0xFF8B5CF6),
    Color(0xFF06B6D4),
  ];

  @override
  Widget build(BuildContext context) {
    // Use the full id hash for more visually distinct color distribution
    // vs. first character only (which clusters categories starting with same letter).
    final colorIndex =
        category.id.codeUnits.fold(0, (a, b) => a + b) % _iconColors.length;
    final color = _iconColors[colorIndex];

    return GestureDetector(
      onTap: () {
        // TODO(#24): navigate to ProductList filtered by category.id
      },
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: AppDimensions.categoryTileSize,
            height: AppDimensions.categoryTileSize,
            decoration: BoxDecoration(
              color: color.withAlpha(26),
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: category.image != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    child: Image.network(
                      category.image!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _CategoryIcon(color: color),
                    ),
                  )
                : _CategoryIcon(color: color),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            category.name,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _CategoryIcon extends StatelessWidget {
  final Color color;

  const _CategoryIcon({required this.color});

  @override
  Widget build(BuildContext context) {
    return Icon(Icons.category_rounded, color: color, size: 28);
  }
}
