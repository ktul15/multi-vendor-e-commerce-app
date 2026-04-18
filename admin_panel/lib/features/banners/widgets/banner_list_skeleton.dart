import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin banner list loading state.
/// Must be wrapped in [SkeletonContainer].
class BannerListSkeleton extends StatelessWidget {
  const BannerListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Filter bar
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.xl, AppSpacing.base, AppSpacing.xl, 0),
          child: Row(
            children: const [
              SkeletonBox(width: 40, height: 14),
              SizedBox(width: AppSpacing.sm),
              SkeletonBox(width: 48, height: 28, radius: 999),
              SizedBox(width: AppSpacing.xs),
              SkeletonBox(width: 60, height: 28, radius: 999),
              SizedBox(width: AppSpacing.xs),
              SkeletonBox(width: 68, height: 28, radius: 999),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.base),

        // Banner list card
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: AppColors.border),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 5,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) => const _BannerRowSkeleton(),
            ),
          ),
        ),
      ],
    );
  }
}

class _BannerRowSkeleton extends StatelessWidget {
  const _BannerRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: const [
          // Image thumbnail
          SkeletonBox(width: 72, height: 40, radius: 6),
          SizedBox(width: AppSpacing.base),
          // Title + URL
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: double.infinity, height: 14),
                SizedBox(height: AppSpacing.xs),
                SkeletonBox(width: 160, height: 12),
              ],
            ),
          ),
          SizedBox(width: AppSpacing.base),
          // Active badge
          SkeletonBox(width: 60, height: 22, radius: 999),
          SizedBox(width: AppSpacing.sm),
          // Position
          SkeletonBox(width: 24, height: 14),
          SizedBox(width: AppSpacing.sm),
          // Action icons
          SkeletonBox(width: 32, height: 32, radius: 6),
          SizedBox(width: AppSpacing.xs),
          SkeletonBox(width: 32, height: 32, radius: 6),
          SizedBox(width: AppSpacing.xs),
          SkeletonBox(width: 32, height: 32, radius: 6),
          SizedBox(width: AppSpacing.xs),
          SkeletonBox(width: 24, height: 24, radius: 4),
        ],
      ),
    );
  }
}
