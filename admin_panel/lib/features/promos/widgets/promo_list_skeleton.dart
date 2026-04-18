import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the admin promo code list loading state.
/// Must be wrapped in [SkeletonContainer].
class PromoListSkeleton extends StatelessWidget {
  const PromoListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Filter / search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.xl, AppSpacing.base, AppSpacing.xl, 0),
          child: Row(
            children: const [
              SkeletonBox(width: 220, height: 40, radius: 8),
              SizedBox(width: AppSpacing.md),
              SkeletonBox(width: 48, height: 28, radius: 999),
              SizedBox(width: AppSpacing.xs),
              SkeletonBox(width: 60, height: 28, radius: 999),
              SizedBox(width: AppSpacing.xs),
              SkeletonBox(width: 68, height: 28, radius: 999),
              SizedBox(width: AppSpacing.md),
              SkeletonBox(width: 36, height: 28, radius: 999),
              SizedBox(width: AppSpacing.xs),
              SkeletonBox(width: 54, height: 28, radius: 999),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.base),

        // Table
        SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpacing.xl, 0, AppSpacing.xl, AppSpacing.xl),
          physics: const NeverScrollableScrollPhysics(),
          child: Container(
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
                        Expanded(flex: 2, child: SkeletonBox(width: 50, height: 12)),
                        SizedBox(width: AppSpacing.xl),
                        Expanded(flex: 2, child: SkeletonBox(width: 60, height: 12)),
                        SizedBox(width: AppSpacing.xl),
                        Expanded(flex: 2, child: SkeletonBox(width: 70, height: 12)),
                        SizedBox(width: AppSpacing.xl),
                        Expanded(flex: 1, child: SkeletonBox(width: 50, height: 12)),
                        SizedBox(width: AppSpacing.xl),
                        Expanded(flex: 2, child: SkeletonBox(width: 60, height: 12)),
                        SizedBox(width: AppSpacing.xl),
                        Expanded(flex: 1, child: SkeletonBox(width: 50, height: 12)),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  ...List.generate(6, (_) => const _PromoRowSkeleton()),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _PromoRowSkeleton extends StatelessWidget {
  const _PromoRowSkeleton();

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
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 1, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 2, child: SkeletonBox(width: double.infinity, height: 14)),
              SizedBox(width: AppSpacing.xl),
              Expanded(flex: 1, child: SkeletonBox(width: 36, height: 22, radius: 999)),
            ],
          ),
        ),
        const Divider(height: 1),
      ],
    );
  }
}
