import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/cart_model.dart';

const _kItemThumbnailSize = 52.0;

class OrderSummarySection extends StatelessWidget {
  final CartModel cart;

  const OrderSummarySection({super.key, required this.cart});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: cart.vendorGroups.map((group) {
        return _VendorGroup(group: group);
      }).toList(),
    );
  }
}

class _VendorGroup extends StatelessWidget {
  final CartVendorGroup group;

  const _VendorGroup({required this.group});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.base,
            AppSpacing.base,
            AppSpacing.base,
            AppSpacing.sm,
          ),
          child: Row(
            children: [
              const Icon(Icons.storefront_outlined,
                  size: 16, color: AppColors.textSecondary),
              const SizedBox(width: AppSpacing.xs),
              Text(
                group.vendorName ?? 'Vendor',
                style: AppTextStyles.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        ...group.items.map((item) => _OrderItemRow(item: item)),
        const Divider(height: 1),
      ],
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final CartItemModel item;

  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: item.thumbnailUrl != null
                ? Image.network(
                    item.thumbnailUrl!,
                    width: _kItemThumbnailSize,
                    height: _kItemThumbnailSize,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, _) => _placeholder(),
                  )
                : _placeholder(),
          ),
          const SizedBox(width: AppSpacing.md),
          // Name + variant
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: AppTextStyles.body
                      .copyWith(fontWeight: FontWeight.w500),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  item.variantLabel,
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Qty + price
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${item.lineTotal.toStringAsFixed(2)}',
                style: AppTextStyles.body
                    .copyWith(fontWeight: FontWeight.w600),
              ),
              Text(
                'x${item.quantity}',
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: _kItemThumbnailSize,
      height: _kItemThumbnailSize,
      color: AppColors.divider,
      child: const Icon(Icons.image_outlined,
          color: AppColors.textSecondary, size: 24),
    );
  }
}
