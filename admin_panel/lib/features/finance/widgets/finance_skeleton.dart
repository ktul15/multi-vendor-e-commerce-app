import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin finance page loading state.
/// Must be wrapped in [SkeletonContainer].
class FinanceSkeleton extends StatelessWidget {
  const FinanceSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.base),
      physics: const NeverScrollableScrollPhysics(),
      children: [
        // Revenue section title
        const SkeletonBox(width: 80, height: 20),
        const SizedBox(height: AppSpacing.sm),

        // Date range bar
        const SkeletonBox(width: 160, height: 36, radius: 6),
        const SizedBox(height: AppSpacing.base),

        // Revenue chart
        const SkeletonBox(width: double.infinity, height: 240, radius: AppRadius.md),
        const SizedBox(height: AppSpacing.sm),

        // Revenue summary row
        Row(
          children: const [
            Expanded(child: _SummaryTileSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _SummaryTileSkeleton()),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),

        // Commission settings title
        const SkeletonBox(width: 180, height: 20),
        const SizedBox(height: AppSpacing.sm),

        // Commission card
        Container(
          padding: const EdgeInsets.all(AppSpacing.xl),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 160, height: 14),
                  SizedBox(height: AppSpacing.xs),
                  SkeletonBox(width: 80, height: 28),
                  SizedBox(height: AppSpacing.xs),
                  SkeletonBox(width: 120, height: 12),
                ],
              ),
              SkeletonBox(width: 100, height: 40, radius: 8),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
    );
  }
}

class _SummaryTileSkeleton extends StatelessWidget {
  const _SummaryTileSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: const [
          SkeletonBox(width: 36, height: 36, radius: 8),
          SizedBox(width: AppSpacing.sm),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 80, height: 18),
              SizedBox(height: AppSpacing.xs),
              SkeletonBox(width: 100, height: 12),
            ],
          ),
        ],
      ),
    );
  }
}
