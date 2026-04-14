import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin category list loading state.
/// Must be wrapped in [SkeletonContainer].
class CategorySkeleton extends StatelessWidget {
  const CategorySkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      physics: const NeverScrollableScrollPhysics(),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            // Table header
            Padding(
              padding: const EdgeInsets.all(AppSpacing.base),
              child: Row(
                children: const [
                  Expanded(flex: 4, child: SkeletonBox(width: 50, height: 12)),
                  SizedBox(width: AppSpacing.xl),
                  Expanded(flex: 3, child: SkeletonBox(width: 40, height: 12)),
                  SizedBox(width: AppSpacing.xl),
                  Expanded(flex: 2, child: SkeletonBox(width: 50, height: 12)),
                  SizedBox(width: AppSpacing.xl),
                  Expanded(flex: 1, child: SkeletonBox(width: 40, height: 12)),
                  SizedBox(width: AppSpacing.xl),
                  SkeletonBox(width: 70, height: 12),
                ],
              ),
            ),
            const Divider(height: 1),
            // Category rows (mix of top-level and subcategory)
            ...[0, 1, 0, 2, 0, 1, 0, 0].map((depth) => _CategoryRowSkeleton(depth: depth)),
          ],
        ),
      ),
    );
  }
}

class _CategoryRowSkeleton extends StatelessWidget {
  final int depth;

  const _CategoryRowSkeleton({required this.depth});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.base,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              Expanded(
                flex: 4,
                child: Padding(
                  padding: EdgeInsets.only(left: depth * 16.0),
                  child: Row(
                    children: [
                      if (depth > 0) ...[
                        const SkeletonBox(width: 16, height: 16, radius: 4),
                        const SizedBox(width: AppSpacing.xs),
                      ],
                      const Expanded(
                        child: SkeletonBox(width: double.infinity, height: 14),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xl),
              const Expanded(flex: 3, child: SkeletonBox(width: double.infinity, height: 12)),
              const SizedBox(width: AppSpacing.xl),
              const Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
              const SizedBox(width: AppSpacing.xl),
              const Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 32, radius: 4)),
              const SizedBox(width: AppSpacing.xl),
              Row(
                children: const [
                  SkeletonBox(width: 32, height: 32, radius: 6),
                  SizedBox(width: AppSpacing.xs),
                  SkeletonBox(width: 32, height: 32, radius: 6),
                ],
              ),
            ],
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}
