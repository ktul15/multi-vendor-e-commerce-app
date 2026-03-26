import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';

class OrderStatusBadge extends StatelessWidget {
  final String status;

  const OrderStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, label) = _statusStyle(status);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  static (Color, String) _statusStyle(String status) {
    return switch (status.toUpperCase()) {
      'PENDING' => (AppColors.warning, 'Pending'),
      'CONFIRMED' => (AppColors.info, 'Confirmed'),
      'PROCESSING' => (AppColors.info, 'Processing'),
      'SHIPPED' => (AppColors.primary, 'Shipped'),
      'DELIVERED' => (AppColors.success, 'Delivered'),
      'CANCELLED' => (AppColors.error, 'Cancelled'),
      'REFUNDED' => (AppColors.error, 'Refunded'),
      _ => (AppColors.textSecondary, status),
    };
  }
}
