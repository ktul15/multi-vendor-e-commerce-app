import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

/// Skeleton for the store page loading state.
/// Must be wrapped in [SkeletonContainer].
class StoreSkeleton extends StatelessWidget {
  const StoreSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      physics: const NeverScrollableScrollPhysics(),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 640),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page title + status badge
            const SkeletonBox(width: 100, height: 28),
            const SizedBox(height: AppSpacing.sm),
            const SkeletonBox(width: 160, height: 20, radius: 999),
            const SizedBox(height: AppSpacing.lg),

            // Form card
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SkeletonBox(width: 120, height: 20),
                  const SizedBox(height: AppSpacing.lg),

                  // Store name field
                  const SkeletonBox(width: 80, height: 12),
                  const SizedBox(height: AppSpacing.xs),
                  const SkeletonBox(
                    width: double.infinity,
                    height: 48,
                    radius: 8,
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Description field
                  const SkeletonBox(width: 80, height: 12),
                  const SizedBox(height: AppSpacing.xs),
                  const SkeletonBox(
                    width: double.infinity,
                    height: 100,
                    radius: 8,
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Save button
                  const SkeletonBox(
                    width: double.infinity,
                    height: 48,
                    radius: 8,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
