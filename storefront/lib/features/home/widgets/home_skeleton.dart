import 'package:flutter/material.dart';
import '../../../core/theme/app_dimensions.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/skeleton_box.dart';

// ── HomeSkeleton ──────────────────────────────────────────────────────────────

/// Full home screen skeleton shown while data is loading.
class HomeSkeleton extends StatelessWidget {
  const HomeSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonContainer(child: const _HomeSkeletonContent());
  }
}

// ── Skeleton content ──────────────────────────────────────────────────────────

class _HomeSkeletonContent extends StatelessWidget {
  const _HomeSkeletonContent();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // App bar skeleton
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(width: 80, height: 14),
                      SizedBox(height: AppSpacing.xs),
                      SkeletonBox(width: 160, height: 22),
                    ],
                  ),
                ),
                const SkeletonBox(width: 40, height: 40, radius: AppRadius.full),
                const SizedBox(width: AppSpacing.sm),
                const SkeletonBox(width: 40, height: 40, radius: AppRadius.full),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.base),

          // Banner skeleton
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
            child: SkeletonBox(
              width: double.infinity,
              height: AppDimensions.bannerHeight,
              radius: AppRadius.xl,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // Section title skeleton
          _sectionHeader(),
          const SizedBox(height: AppSpacing.md),

          // Category grid skeleton
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
            child: Wrap(
              spacing: AppSpacing.md,
              runSpacing: AppSpacing.md,
              children: List.generate(
                8,
                (_) => const Column(
                  children: [
                    SkeletonBox(
                      width: AppDimensions.categoryTileSize,
                      height: AppDimensions.categoryTileSize,
                      radius: AppRadius.lg,
                    ),
                    SizedBox(height: AppSpacing.xs),
                    SkeletonBox(width: AppDimensions.categoryTileSize, height: 12),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // Trending section skeleton
          _sectionHeader(),
          const SizedBox(height: AppSpacing.sm),
          _horizontalProductSkeleton(),
          const SizedBox(height: AppSpacing.xl),

          // New arrivals section skeleton
          _sectionHeader(),
          const SizedBox(height: AppSpacing.sm),
          _horizontalProductSkeleton(),
        ],
      ),
    );
  }

  Widget _sectionHeader() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: AppSpacing.base),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          SkeletonBox(width: 120, height: 20),
          SkeletonBox(width: 56, height: 16),
        ],
      ),
    );
  }

  Widget _horizontalProductSkeleton() {
    return SizedBox(
      height: AppDimensions.productListHeight,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
        itemCount: 4,
        separatorBuilder: (context, index) =>
            const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) => const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(
              width: AppDimensions.productCardWidth,
              height: AppDimensions.productCardWidth,
            ),
            SizedBox(height: AppSpacing.sm),
            SkeletonBox(width: 140, height: 14),
            SizedBox(height: AppSpacing.xs),
            SkeletonBox(width: 80, height: 14),
            SizedBox(height: AppSpacing.xs),
            SkeletonBox(width: 60, height: 12),
          ],
        ),
      ),
    );
  }
}
