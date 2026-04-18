import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin user management loading state.
/// Must be wrapped in [SkeletonContainer].
class UserListSkeleton extends StatelessWidget {
  const UserListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search bar + filter chips
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.base,
            AppSpacing.sm,
            AppSpacing.base,
            AppSpacing.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SkeletonBox(width: double.infinity, height: 44, radius: 8),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: const [
                  SkeletonBox(width: 48, height: 28, radius: 999),
                  SizedBox(width: AppSpacing.xs),
                  SkeletonBox(width: 84, height: 28, radius: 999),
                  SizedBox(width: AppSpacing.xs),
                  SkeletonBox(width: 64, height: 28, radius: 999),
                ],
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 10,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) => const _UserRowSkeleton(),
        ),
      ],
    );
  }
}

class _UserRowSkeleton extends StatelessWidget {
  const _UserRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: const [
          SkeletonBox(width: 40, height: 40, radius: 999),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: 120, height: 14),
                SizedBox(height: AppSpacing.xs),
                SkeletonBox(width: 180, height: 12),
              ],
            ),
          ),
          SizedBox(width: AppSpacing.md),
          SkeletonBox(width: 70, height: 22, radius: 999),
          SizedBox(width: AppSpacing.md),
          SkeletonBox(width: 60, height: 30, radius: 6),
        ],
      ),
    );
  }
}
