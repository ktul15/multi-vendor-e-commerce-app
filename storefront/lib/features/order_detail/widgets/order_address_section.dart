import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/address_model.dart';

class OrderAddressSection extends StatelessWidget {
  final AddressModel address;

  const OrderAddressSection({super.key, required this.address});

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
            Row(
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text('Shipping Address', style: AppTextStyles.h5),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              address.fullName,
              style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(address.phone, style: AppTextStyles.bodySmall),
            const SizedBox(height: AppSpacing.xs),
            Text(address.singleLine, style: AppTextStyles.bodySmall),
          ],
        ),
      ),
    );
  }
}
