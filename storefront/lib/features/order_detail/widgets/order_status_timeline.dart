import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';

/// A vertical 4-step timeline: Placed → Confirmed → Shipped → Delivered.
class OrderStatusTimeline extends StatelessWidget {
  final String status;

  const OrderStatusTimeline({super.key, required this.status});

  static const _steps = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];

  static const _stepIcons = [
    Icons.receipt_long_outlined,
    Icons.check_circle_outline,
    Icons.local_shipping_outlined,
    Icons.inventory_2_outlined,
  ];

  /// Maps an order status to the active step index (0-3), or -1 for cancelled/refunded.
  static int _activeIndex(String status) => switch (status.toUpperCase()) {
        'PENDING' => 0,
        'CONFIRMED' || 'PROCESSING' => 1,
        'SHIPPED' => 2,
        'DELIVERED' => 3,
        _ => -1, // CANCELLED, REFUNDED
      };

  @override
  Widget build(BuildContext context) {
    final activeIdx = _activeIndex(status);
    final isCancelled =
        status.toUpperCase() == 'CANCELLED' || status.toUpperCase() == 'REFUNDED';

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
            Text('Order Status', style: AppTextStyles.h5),
            const SizedBox(height: AppSpacing.base),
            if (isCancelled) _CancelledBanner(status: status),
            if (isCancelled) const SizedBox(height: AppSpacing.md),
            for (int i = 0; i < _steps.length; i++) ...[
              _TimelineStep(
                label: _steps[i],
                icon: _stepIcons[i],
                isCompleted: !isCancelled && i < activeIdx,
                isActive: !isCancelled && i == activeIdx,
                isCancelled: isCancelled,
              ),
              if (i < _steps.length - 1)
                _TimelineConnector(
                  isCompleted: !isCancelled && i < activeIdx,
                  isCancelled: isCancelled,
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CancelledBanner extends StatelessWidget {
  final String status;
  const _CancelledBanner({required this.status});

  @override
  Widget build(BuildContext context) {
    final isCancelled = status.toUpperCase() == 'CANCELLED';
    final color = isCancelled ? AppColors.error : AppColors.warning;
    final label = isCancelled ? 'Order Cancelled' : 'Order Refunded';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, size: 18, color: color),
          const SizedBox(width: AppSpacing.sm),
          Text(
            label,
            style: AppTextStyles.body.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isCompleted;
  final bool isActive;
  final bool isCancelled;

  const _TimelineStep({
    required this.label,
    required this.icon,
    required this.isCompleted,
    required this.isActive,
    required this.isCancelled,
  });

  @override
  Widget build(BuildContext context) {
    final Color circleColor;
    final Color iconColor;
    final Color textColor;

    if (isCancelled) {
      circleColor = AppColors.border;
      iconColor = AppColors.textSecondary;
      textColor = AppColors.textSecondary;
    } else if (isCompleted) {
      circleColor = AppColors.success;
      iconColor = Colors.white;
      textColor = AppColors.textPrimary;
    } else if (isActive) {
      circleColor = AppColors.primary;
      iconColor = Colors.white;
      textColor = AppColors.textPrimary;
    } else {
      circleColor = AppColors.border;
      iconColor = AppColors.textSecondary;
      textColor = AppColors.textSecondary;
    }

    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: circleColor,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 18, color: iconColor),
        ),
        const SizedBox(width: AppSpacing.md),
        Text(
          label,
          style: AppTextStyles.body.copyWith(
            color: textColor,
            fontWeight: (isCompleted || isActive) ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
        if (isCompleted) ...[
          const SizedBox(width: AppSpacing.sm),
          const Icon(Icons.check, size: 16, color: AppColors.success),
        ],
      ],
    );
  }
}

class _TimelineConnector extends StatelessWidget {
  static const double _circleSize = 36;
  static const double _lineWidth = 2;

  final bool isCompleted;
  final bool isCancelled;

  const _TimelineConnector({
    required this.isCompleted,
    required this.isCancelled,
  });

  @override
  Widget build(BuildContext context) {
    final color = isCancelled
        ? AppColors.border
        : isCompleted
            ? AppColors.success
            : AppColors.border;

    return Padding(
      padding: const EdgeInsets.only(
        left: (_circleSize - _lineWidth) / 2,
      ),
      child: Container(
        width: _lineWidth,
        height: 24,
        color: color,
      ),
    );
  }
}
