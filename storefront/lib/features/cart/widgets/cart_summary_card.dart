import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/cart_model.dart';

class CartSummaryCard extends StatelessWidget {
  final double subtotal;
  final PromoPreviewModel? promoPreview;

  const CartSummaryCard({
    super.key,
    required this.subtotal,
    this.promoPreview,
  });

  @override
  Widget build(BuildContext context) {
    // Use the server-rounded total when a promo is applied so the displayed
    // amount exactly matches what the backend will charge.
    final total = promoPreview?.total ?? subtotal;

    return Card(
      margin: const EdgeInsets.all(AppSpacing.base),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          children: [
            _SummaryRow(
              label: 'Subtotal',
              value: '\$${subtotal.toStringAsFixed(2)}',
            ),
            if (promoPreview != null) ...[
              const SizedBox(height: AppSpacing.sm),
              _SummaryRow(
                label: 'Promo (${promoPreview!.code})',
                value: '-\$${promoPreview!.discountAmount.toStringAsFixed(2)}',
                valueColor: AppColors.success,
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            const Divider(color: AppColors.border),
            const SizedBox(height: AppSpacing.sm),
            _SummaryRow(
              label: 'Total',
              value: '\$${total.toStringAsFixed(2)}',
              bold: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool bold;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.bold = false,
  });

  @override
  Widget build(BuildContext context) {
    final style = bold
        ? AppTextStyles.body.copyWith(fontWeight: FontWeight.w700)
        : AppTextStyles.body;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(
          value,
          style: style.copyWith(color: valueColor),
        ),
      ],
    );
  }
}
