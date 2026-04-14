import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the order detail loading state.
/// Must be wrapped in [SkeletonContainer].
class OrderDetailSkeleton extends StatelessWidget {
  const OrderDetailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.md,
      ),
      physics: const NeverScrollableScrollPhysics(),
      children: [
        // Status timeline placeholder
        const SkeletonBox(width: double.infinity, height: 56, radius: AppRadius.md),
        const SizedBox(height: AppSpacing.base),

        // Items section
        _sectionCard(
          children: [
            const SkeletonBox(width: 80, height: 18),
            const SizedBox(height: AppSpacing.md),
            ...[1, 2, 3].map((_) => const _OrderItemSkeleton()),
          ],
        ),
        const SizedBox(height: AppSpacing.base),

        // Address section
        _sectionCard(
          children: [
            const SkeletonBox(width: 80, height: 18),
            const SizedBox(height: AppSpacing.md),
            const SkeletonBox(width: double.infinity, height: 14),
            const SizedBox(height: AppSpacing.xs),
            const SkeletonBox(width: 200, height: 14),
            const SizedBox(height: AppSpacing.xs),
            const SkeletonBox(width: 160, height: 14),
          ],
        ),
        const SizedBox(height: AppSpacing.base),

        // Order summary
        _sectionCard(
          children: [
            const SkeletonBox(width: 120, height: 18),
            const SizedBox(height: AppSpacing.md),
            const _SummaryRowSkeleton(),
            const SizedBox(height: AppSpacing.sm),
            const _SummaryRowSkeleton(),
            const SizedBox(height: AppSpacing.sm),
            const _SummaryRowSkeleton(),
          ],
        ),
      ],
    );
  }

  Widget _sectionCard({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _OrderItemSkeleton extends StatelessWidget {
  const _OrderItemSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        children: [
          const SkeletonBox(width: 56, height: 56, radius: AppRadius.sm),
          const SizedBox(width: AppSpacing.md),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonBox(width: double.infinity, height: 14),
                SizedBox(height: AppSpacing.xs),
                SkeletonBox(width: 80, height: 12),
              ],
            ),
          ),
          const SkeletonBox(width: 60, height: 14),
        ],
      ),
    );
  }
}

class _SummaryRowSkeleton extends StatelessWidget {
  const _SummaryRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        SkeletonBox(width: 80, height: 14),
        SkeletonBox(width: 60, height: 14),
      ],
    );
  }
}
