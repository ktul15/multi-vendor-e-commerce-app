import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin vendor list loading state.
/// Must be wrapped in [SkeletonContainer].
class VendorListSkeleton extends StatelessWidget {
  const VendorListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Search field
          const SkeletonBox(width: 320, height: 40, radius: 8),
          const SizedBox(height: AppSpacing.md),

          // Status filter chips
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: List.generate(
              5,
              (_) => const SkeletonBox(width: 80, height: 32, radius: 999),
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
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  child: Row(
                    children: const [
                      Expanded(flex: 3, child: SkeletonBox(width: 60, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 3, child: SkeletonBox(width: 60, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 2, child: SkeletonBox(width: 50, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 2, child: SkeletonBox(width: 80, height: 12)),
                      SizedBox(width: AppSpacing.xl),
                      Expanded(flex: 2, child: SkeletonBox(width: 60, height: 12)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                ...List.generate(8, (_) => const _VendorRowSkeleton()),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VendorRowSkeleton extends StatelessWidget {
  const _VendorRowSkeleton();

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
              Expanded(flex: 3, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonBox(width: double.infinity, height: 14),
                    SizedBox(height: 4),
                    SkeletonBox(width: double.infinity, height: 12),
                  ],
                ),
              ),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 22, radius: 999)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: 70, height: 28, radius: 6)),
            ],
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}
