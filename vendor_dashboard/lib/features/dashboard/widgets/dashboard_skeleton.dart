import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the vendor dashboard loading state.
/// Must be wrapped in [SkeletonContainer].
class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Page title
          const SkeletonBox(width: 120, height: 28),
          const SizedBox(height: AppSpacing.lg),

          // Summary cards — 2x2 grid
          Row(
            children: const [
              Expanded(child: _SummaryCardSkeleton()),
              SizedBox(width: AppSpacing.md),
              Expanded(child: _SummaryCardSkeleton()),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: const [
              Expanded(child: _SummaryCardSkeleton()),
              SizedBox(width: AppSpacing.md),
              Expanded(child: _SummaryCardSkeleton()),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // Revenue chart placeholder
          const SkeletonBox(width: double.infinity, height: 220, radius: 12),
          const SizedBox(height: AppSpacing.lg),

          // Recent orders table header
          const SkeletonBox(width: 140, height: 20),
          const SizedBox(height: AppSpacing.md),
          ...[1, 2, 3, 4, 5].map((_) => const _TableRowSkeleton()),
        ],
      ),
    );
  }
}

class _SummaryCardSkeleton extends StatelessWidget {
  const _SummaryCardSkeleton();

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
          SkeletonBox(width: 32, height: 32, radius: 8),
          SizedBox(height: AppSpacing.sm),
          SkeletonBox(width: 80, height: 12),
          SizedBox(height: AppSpacing.xs),
          SkeletonBox(width: 60, height: 20),
        ],
      ),
    );
  }
}

class _TableRowSkeleton extends StatelessWidget {
  const _TableRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: const [
          Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 20, radius: 999)),
          SizedBox(width: AppSpacing.md),
          Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 14)),
        ],
      ),
    );
  }
}
