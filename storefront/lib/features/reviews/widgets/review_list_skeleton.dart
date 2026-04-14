import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the review list loading state.
/// Must be wrapped in [SkeletonContainer].
class ReviewListSkeleton extends StatelessWidget {
  const ReviewListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      physics: const NeverScrollableScrollPhysics(),
      slivers: [
        // Rating breakdown header placeholder
        SliverToBoxAdapter(
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.all(AppSpacing.base),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    SkeletonBox(width: 48, height: 48),
                    SizedBox(width: AppSpacing.base),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SkeletonBox(width: 100, height: 20),
                        SizedBox(height: AppSpacing.xs),
                        SkeletonBox(width: 80, height: 14),
                      ],
                    ),
                  ],
                ),
                SizedBox(height: AppSpacing.md),
                SkeletonBox(width: double.infinity, height: 12),
                SizedBox(height: AppSpacing.xs),
                SkeletonBox(width: double.infinity, height: 12),
                SizedBox(height: AppSpacing.xs),
                SkeletonBox(width: double.infinity, height: 12),
              ],
            ),
          ),
        ),

        // Sort bar placeholder
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: AppSpacing.base,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                SkeletonBox(width: 80, height: 14),
                Spacer(),
                SkeletonBox(width: 60, height: 28, radius: AppRadius.full),
                SizedBox(width: AppSpacing.sm),
                SkeletonBox(width: 60, height: 28, radius: AppRadius.full),
                SizedBox(width: AppSpacing.sm),
                SkeletonBox(width: 60, height: 28, radius: AppRadius.full),
              ],
            ),
          ),
        ),

        // Review cards
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) => const _ReviewCardSkeleton(),
            childCount: 4,
          ),
        ),
      ],
    );
  }
}

class _ReviewCardSkeleton extends StatelessWidget {
  const _ReviewCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SkeletonBox(width: 40, height: 40, radius: AppRadius.full),
              SizedBox(width: AppSpacing.md),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 100, height: 14),
                  SizedBox(height: AppSpacing.xs),
                  SkeletonBox(width: 80, height: 12),
                ],
              ),
            ],
          ),
          SizedBox(height: AppSpacing.sm),
          SkeletonBox(width: 100, height: 14),
          SizedBox(height: AppSpacing.sm),
          SkeletonBox(width: double.infinity, height: 12),
          SizedBox(height: AppSpacing.xs),
          SkeletonBox(width: 240, height: 12),
          Divider(height: AppSpacing.xl),
        ],
      ),
    );
  }
}
