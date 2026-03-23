import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/cart_model.dart';
import 'cart_item_tile.dart';

class CartVendorSection extends StatelessWidget {
  final CartVendorGroup group;
  final bool isUpdating;

  const CartVendorSection({
    super.key,
    required this.group,
    required this.isUpdating,
  });

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
              const Icon(
                Icons.storefront_outlined,
                size: 16,
                color: AppColors.textSecondary,
              ),
              const SizedBox(width: AppSpacing.xs),
              Text(
                group.vendorName ?? 'Unknown Vendor',
                style: AppTextStyles.bodySmall.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: group.items.length,
          separatorBuilder: (context, index) => const Divider(
            height: 1,
            indent: AppSpacing.base,
            endIndent: AppSpacing.base,
            color: AppColors.divider,
          ),
          itemBuilder: (context, index) => CartItemTile(
            item: group.items[index],
            isUpdating: isUpdating,
          ),
        ),
        const Divider(height: 1, color: AppColors.border),
      ],
    );
  }
}
