import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/cart_model.dart';

class CheckoutPriceSummary extends StatelessWidget {
  final CartModel cart;
  final PromoPreviewModel? promoPreview;

  const CheckoutPriceSummary({
    super.key,
    required this.cart,
    this.promoPreview,
  });

  @override
  Widget build(BuildContext context) {
    final subtotal = cart.subtotal;
    final discount = promoPreview?.discountAmount ?? 0.0;
    final total = promoPreview?.total ?? subtotal;

    return Container(
      margin: const EdgeInsets.all(AppSpacing.base),
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          _Row(label: 'Subtotal', value: subtotal),
          if (discount > 0) ...[
            const SizedBox(height: AppSpacing.sm),
            _Row(
              label: 'Promo (${promoPreview!.code})',
              value: -discount,
              valueColor: AppColors.success,
            ),
          ],
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
            child: Divider(height: 1),
          ),
          _Row(
            label: 'Total',
            value: total,
            labelStyle: AppTextStyles.body.copyWith(fontWeight: FontWeight.w700),
            valueStyle: AppTextStyles.h5,
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final double value;
  final Color? valueColor;
  final TextStyle? labelStyle;
  final TextStyle? valueStyle;

  const _Row({
    required this.label,
    required this.value,
    this.valueColor,
    this.labelStyle,
    this.valueStyle,
  });

  @override
  Widget build(BuildContext context) {
    final sign = value < 0 ? '-' : '';
    final display = '$sign\$${value.abs().toStringAsFixed(2)}';
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: labelStyle ?? AppTextStyles.body),
        Text(
          display,
          style: (valueStyle ?? AppTextStyles.body).copyWith(
            color: valueColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
