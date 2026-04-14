import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the cart loading state.
/// Must be wrapped in [SkeletonContainer].
class CartSkeleton extends StatelessWidget {
  const CartSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.md,
      ),
      physics: const NeverScrollableScrollPhysics(),
      children: [
        // Vendor header
        const SkeletonBox(width: 120, height: 16),
        const SizedBox(height: AppSpacing.md),

        // 3 cart item rows
        ...[1, 2, 3].map((_) => const _CartItemSkeleton()),

        const SizedBox(height: AppSpacing.xl),

        // Order summary card
        Container(
          padding: const EdgeInsets.all(AppSpacing.base),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonBox(width: 120, height: 18),
              SizedBox(height: AppSpacing.md),
              _SummaryRow(),
              SizedBox(height: AppSpacing.sm),
              _SummaryRow(),
              SizedBox(height: AppSpacing.sm),
              _SummaryRow(),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.base),

        // Checkout button placeholder
        SkeletonBox(
          width: double.infinity,
          height: 48,
          radius: AppRadius.md,
        ),
      ],
    );
  }
}

class _CartItemSkeleton extends StatelessWidget {
  const _CartItemSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonBox(width: 80, height: 80, radius: AppRadius.sm),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonBox(width: double.infinity, height: 14),
                const SizedBox(height: AppSpacing.xs),
                const SkeletonBox(width: 100, height: 12),
                const SizedBox(height: AppSpacing.sm),
                const SkeletonBox(width: 60, height: 16),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    const SkeletonBox(width: 28, height: 28, radius: AppRadius.sm),
                    const SizedBox(width: AppSpacing.sm),
                    const SkeletonBox(width: 28, height: 28, radius: AppRadius.sm),
                    const SizedBox(width: AppSpacing.sm),
                    const SkeletonBox(width: 28, height: 28, radius: AppRadius.sm),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow();

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
