import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the wishlist loading state.
/// Must be wrapped in [SkeletonContainer].
class WishlistSkeleton extends StatelessWidget {
  const WishlistSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 6,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: AppSpacing.base),
      itemBuilder: (context, index) => const _WishlistItemSkeleton(),
    );
  }
}

class _WishlistItemSkeleton extends StatelessWidget {
  const _WishlistItemSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          const SkeletonBox(width: 80, height: 80, radius: AppRadius.sm),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonBox(width: double.infinity, height: 14),
                const SizedBox(height: AppSpacing.xs),
                const SkeletonBox(width: 120, height: 12),
                const SizedBox(height: AppSpacing.sm),
                const SkeletonBox(width: 70, height: 16),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          const SkeletonBox(width: 32, height: 32, radius: AppRadius.full),
        ],
      ),
    );
  }
}
