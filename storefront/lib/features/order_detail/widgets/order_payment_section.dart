import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/order_detail_model.dart';

class OrderPaymentSection extends StatelessWidget {
  final PaymentDetail payment;

  const OrderPaymentSection({super.key, required this.payment});

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
                  Icons.payment_outlined,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text('Payment', style: AppTextStyles.h5),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            _InfoRow(label: 'Method', value: payment.methodLabel),
            const SizedBox(height: AppSpacing.sm),
            _InfoRow(label: 'Status', valueWidget: _PaymentStatusChip(status: payment.status)),
            const SizedBox(height: AppSpacing.sm),
            _InfoRow(
              label: 'Amount',
              value: '\$${payment.amount.toStringAsFixed(2)}',
            ),
            if (payment.paidAt != null) ...[
              const SizedBox(height: AppSpacing.sm),
              _InfoRow(label: 'Paid', value: _formatDate(payment.paidAt!)),
            ],
          ],
        ),
      ),
    );
  }

  static String _formatDate(DateTime dt) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? valueWidget;

  const _InfoRow({required this.label, this.value, this.valueWidget});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTextStyles.caption),
        valueWidget ??
            Text(
              value ?? '',
              style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w500),
            ),
      ],
    );
  }
}

class _PaymentStatusChip extends StatelessWidget {
  final String status;

  const _PaymentStatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, label) = _style(status);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }

  static (Color, String) _style(String status) => switch (status.toUpperCase()) {
        'PENDING' => (AppColors.warning, 'Pending'),
        'PROCESSING' => (AppColors.info, 'Processing'),
        'SUCCEEDED' => (AppColors.success, 'Paid'),
        'FAILED' => (AppColors.error, 'Failed'),
        'REFUNDED' => (AppColors.error, 'Refunded'),
        'CANCELLED' => (AppColors.error, 'Cancelled'),
        _ => (AppColors.textSecondary, status),
      };
}
