import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin dashboard loading state.
/// Must be wrapped in [SkeletonContainer].
class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.base),
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stat cards — 2×2 grid
          Row(
            children: const [
              Expanded(child: _StatCardSkeleton()),
              SizedBox(width: AppSpacing.sm),
              Expanded(child: _StatCardSkeleton()),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: const [
              Expanded(child: _StatCardSkeleton()),
              SizedBox(width: AppSpacing.sm),
              Expanded(child: _StatCardSkeleton()),
            ],
          ),
          const SizedBox(height: AppSpacing.base),

          // Revenue chart placeholder
          const SkeletonBox(width: double.infinity, height: 240, radius: AppRadius.md),
          const SizedBox(height: AppSpacing.base),

          // Recent orders table header
          const SkeletonBox(width: 140, height: 20),
          const SizedBox(height: AppSpacing.sm),
          ...[1, 2, 3, 4, 5].map((_) => const _RecentOrderRowSkeleton()),
        ],
      ),
    );
  }
}

class _StatCardSkeleton extends StatelessWidget {
  const _StatCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SkeletonBox(width: 100, height: 14),
              SkeletonBox(width: 36, height: 36, radius: 8),
            ],
          ),
          SizedBox(height: AppSpacing.sm),
          SkeletonBox(width: 80, height: 24),
        ],
      ),
    );
  }
}

class _RecentOrderRowSkeleton extends StatelessWidget {
  const _RecentOrderRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: const [
          Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.base),
          Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.base),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 20, radius: 999)),
          SizedBox(width: AppSpacing.base),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 14)),
        ],
      ),
    );
  }
}
