import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the notifications loading state.
/// Must be wrapped in [SkeletonContainer].
class NotificationsSkeleton extends StatelessWidget {
  const NotificationsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 7,
      separatorBuilder: (context, index) =>
          const Divider(height: 1, indent: AppSpacing.base),
      itemBuilder: (context, index) => const _NotificationTileSkeleton(),
    );
  }
}

class _NotificationTileSkeleton extends StatelessWidget {
  const _NotificationTileSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.md,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonBox(width: 44, height: 44, radius: AppRadius.full),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonBox(width: double.infinity, height: 14),
                const SizedBox(height: AppSpacing.xs),
                const SkeletonBox(width: 200, height: 12),
                const SizedBox(height: AppSpacing.sm),
                const SkeletonBox(width: 80, height: 11),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
