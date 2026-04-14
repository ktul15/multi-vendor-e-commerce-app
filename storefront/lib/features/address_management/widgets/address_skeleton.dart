import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the address management loading state.
/// Must be wrapped in [SkeletonContainer].
class AddressSkeleton extends StatelessWidget {
  const AddressSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.base),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 3,
      separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) => const _AddressCardSkeleton(),
    );
  }
}

class _AddressCardSkeleton extends StatelessWidget {
  const _AddressCardSkeleton();

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
            children: [
              SkeletonBox(width: 130, height: 16),
              SizedBox(width: AppSpacing.sm),
              SkeletonBox(width: 56, height: 20, radius: AppRadius.full),
            ],
          ),
          SizedBox(height: AppSpacing.sm),
          SkeletonBox(width: double.infinity, height: 13),
          SizedBox(height: AppSpacing.xs),
          SkeletonBox(width: 200, height: 13),
          SizedBox(height: AppSpacing.md),
          Row(
            children: [
              SkeletonBox(width: 80, height: 32, radius: AppRadius.sm),
              SizedBox(width: AppSpacing.sm),
              SkeletonBox(width: 64, height: 32, radius: AppRadius.sm),
            ],
          ),
        ],
      ),
    );
  }
}
