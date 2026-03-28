import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/order_detail_model.dart';

class OrderItemsSection extends StatelessWidget {
  final List<OrderItemDetail> items;

  const OrderItemsSection({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      color: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Items (${items.length})',
              style: AppTextStyles.h5,
            ),
            const SizedBox(height: AppSpacing.md),
            for (int i = 0; i < items.length; i++) ...[
              _ItemRow(item: items[i]),
              if (i < items.length - 1)
                const Divider(height: AppSpacing.xl, color: AppColors.divider),
            ],
          ],
        ),
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  final OrderItemDetail item;

  const _ItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Product thumbnail
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: item.thumbnailUrl != null
              ? Image.network(
                  item.thumbnailUrl!,
                  width: 64,
                  height: 64,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholder(),
                )
              : _placeholder(),
        ),
        const SizedBox(width: AppSpacing.md),

        // Details
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.productName,
                style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (item.variantLabel != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(item.variantLabel!, style: AppTextStyles.caption),
              ],
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Qty: ${item.quantity}  \u00d7  \$${item.unitPrice.toStringAsFixed(2)}',
                    style: AppTextStyles.bodySmall,
                  ),
                  Text(
                    '\$${item.totalPrice.toStringAsFixed(2)}',
                    style: AppTextStyles.body.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  static Widget _placeholder() {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: AppColors.divider,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: const Icon(
        Icons.image_outlined,
        color: AppColors.textSecondary,
        size: 28,
      ),
    );
  }
}
