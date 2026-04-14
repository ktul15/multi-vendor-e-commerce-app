import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the earnings page loading state.
/// Must be wrapped in [SkeletonContainer].
class EarningsSkeleton extends StatelessWidget {
  const EarningsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Page title
          const SkeletonBox(width: 100, height: 28),
          const SizedBox(height: AppSpacing.lg),

          // 3 summary cards in a row
          Row(
            children: const [
              Expanded(child: _EarningsCardSkeleton()),
              SizedBox(width: AppSpacing.md),
              Expanded(child: _EarningsCardSkeleton()),
              SizedBox(width: AppSpacing.md),
              Expanded(child: _EarningsCardSkeleton()),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // Revenue chart
          const SkeletonBox(width: double.infinity, height: 220, radius: 12),
          const SizedBox(height: AppSpacing.lg),

          // Top products table header
          const SkeletonBox(width: 140, height: 20),
          const SizedBox(height: AppSpacing.md),
          ...[1, 2, 3, 4, 5].map((_) => const _TopProductRowSkeleton()),
        ],
      ),
    );
  }
}

class _EarningsCardSkeleton extends StatelessWidget {
  const _EarningsCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBox(width: 80, height: 12),
          SizedBox(height: AppSpacing.xs),
          SkeletonBox(width: 60, height: 20),
        ],
      ),
    );
  }
}

class _TopProductRowSkeleton extends StatelessWidget {
  const _TopProductRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: const [
          Expanded(flex: 3, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 14)),
        ],
      ),
    );
  }
}
