import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/wishlist_model.dart';

class WishlistItemTile extends StatelessWidget {
  final WishlistItemModel item;
  final VoidCallback onTap;
  final VoidCallback onRemove;
  final VoidCallback onMoveToCart;

  const WishlistItemTile({
    super.key,
    required this.item,
    required this.onTap,
    required this.onRemove,
    required this.onMoveToCart,
  });

  @override
  Widget build(BuildContext context) {
    final product = item.product;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product image
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.sm),
              child: product.thumbnailUrl != null
                  ? Image.network(
                      product.thumbnailUrl!,
                      width: 90,
                      height: 90,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const _ImagePlaceholder(),
                    )
                  : const _ImagePlaceholder(),
            ),
            const SizedBox(width: AppSpacing.md),
            // Product details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: AppTextStyles.body.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (product.vendorName != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      product.vendorName!,
                      style: AppTextStyles.caption,
                    ),
                  ],
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      Text(
                        '\$${product.basePrice.toStringAsFixed(2)}',
                        style: AppTextStyles.h6.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                      if (product.avgRating > 0) ...[
                        const SizedBox(width: AppSpacing.sm),
                        const Icon(Icons.star_rounded,
                            size: 14, color: AppColors.rating),
                        const SizedBox(width: 2),
                        Text(
                          product.avgRating.toStringAsFixed(1),
                          style: AppTextStyles.caption,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 34,
                          child: OutlinedButton.icon(
                            onPressed: onMoveToCart,
                            icon: const Icon(Icons.shopping_cart_outlined,
                                size: 16),
                            label: const Text('Move to Cart'),
                            style: OutlinedButton.styleFrom(
                              textStyle: AppTextStyles.caption.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                              ),
                              side: const BorderSide(color: AppColors.primary),
                              foregroundColor: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      SizedBox(
                        height: 34,
                        width: 34,
                        child: IconButton(
                          onPressed: onRemove,
                          icon: const Icon(Icons.delete_outline, size: 18),
                          style: IconButton.styleFrom(
                            foregroundColor: AppColors.error,
                            padding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                    ],
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

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      height: 90,
      color: Colors.grey[200],
      child: Icon(
        Icons.image_outlined,
        color: Colors.grey[400],
        size: 32,
      ),
    );
  }
}
