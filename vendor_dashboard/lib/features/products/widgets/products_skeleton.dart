import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the products table loading state.
/// Must be wrapped in [SkeletonContainer].
class ProductsSkeleton extends StatelessWidget {
  const ProductsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Column headers
        const Padding(
          padding: EdgeInsets.only(bottom: AppSpacing.md),
          child: Row(
            children: [
              Expanded(flex: 3, child: SkeletonBox(width: 60, height: 12)),
              SizedBox(width: AppSpacing.md),
              Expanded(flex: 2, child: SkeletonBox(width: 50, height: 12)),
              SizedBox(width: AppSpacing.md),
              Expanded(flex: 1, child: SkeletonBox(width: 40, height: 12)),
              SizedBox(width: AppSpacing.md),
              Expanded(flex: 1, child: SkeletonBox(width: 40, height: 12)),
            ],
          ),
        ),
        const Divider(height: 1),
        const SizedBox(height: AppSpacing.sm),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 8,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) => const _ProductRowSkeleton(),
        ),
      ],
    );
  }
}

class _ProductRowSkeleton extends StatelessWidget {
  const _ProductRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: const [
          Expanded(flex: 3, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 22, radius: 999)),
          SizedBox(width: AppSpacing.md),
          Row(
            children: [
              SkeletonBox(width: 32, height: 32, radius: 8),
              SizedBox(width: AppSpacing.sm),
              SkeletonBox(width: 32, height: 32, radius: 8),
            ],
          ),
        ],
      ),
    );
  }
}
