import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin order list loading state.
/// Must be wrapped in [SkeletonContainer].
class OrderListSkeleton extends StatelessWidget {
  const OrderListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter chips row
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: List.generate(
              7,
              (_) => const SkeletonBox(width: 72, height: 32, radius: 999),
            ),
          ),
          const SizedBox(height: AppSpacing.base),

          // Table card
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                // Header row
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  child: Row(
                    children: const [
                      Expanded(flex: 2, child: SkeletonBox(width: 70, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 3, child: SkeletonBox(width: 80, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 2, child: SkeletonBox(width: 60, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 1, child: SkeletonBox(width: 50, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 2, child: SkeletonBox(width: 60, height: 12)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                ...List.generate(8, (_) => const _OrderRowSkeleton()),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderRowSkeleton extends StatelessWidget {
  const _OrderRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.base,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: const [
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 3, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 22, radius: 999)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
            ],
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}
