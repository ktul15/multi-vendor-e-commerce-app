import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_dimensions.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import '../models/product_model.dart';

/// Vertical product card used in grids and horizontal carousels.
class ProductCard extends StatelessWidget {
  final ProductModel product;
  final double width;
  final VoidCallback? onTap;

  const ProductCard({
    super.key,
    required this.product,
    this.width = AppDimensions.productCardWidth,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Card(
        clipBehavior: Clip.hardEdge,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProductImage(product: product),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: AppTextStyles.bodySmall.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      '\$${product.displayPrice.toStringAsFixed(2)}',
                      style: AppTextStyles.body.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    ProductRatingRow(product: product),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Reusable rating row (star icon + rating + review count).
class ProductRatingRow extends StatelessWidget {
  final ProductModel product;

  const ProductRatingRow({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
        const SizedBox(width: 2),
        Text(
          product.avgRating > 0
              ? product.avgRating.toStringAsFixed(1)
              : 'New',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        if (product.reviewCount > 0) ...[
          const SizedBox(width: 2),
          Text(
            '(${product.reviewCount})',
            style:
                AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ],
    );
  }
}

// ── Shared internals ─────────────────────────────────────────────────────────

class ProductThumbnail extends StatelessWidget {
  final ProductModel product;
  final double? size;

  const ProductThumbnail({super.key, required this.product, this.size});

  @override
  Widget build(BuildContext context) {
    return product.thumbnailUrl != null
        ? Image.network(
            product.thumbnailUrl!,
            fit: BoxFit.cover,
            width: size,
            height: size,
            errorBuilder: (context, error, stackTrace) =>
                const ProductPlaceholderImage(),
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return const ProductPlaceholderImage();
            },
          )
        : const ProductPlaceholderImage();
  }
}

class _ProductImage extends StatelessWidget {
  final ProductModel product;

  const _ProductImage({required this.product});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: ProductThumbnail(product: product),
    );
  }
}

class ProductPlaceholderImage extends StatelessWidget {
  const ProductPlaceholderImage({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primary.withAlpha(15),
      child: const Icon(Icons.image_rounded, size: 40, color: Colors.black26),
    );
  }
}
