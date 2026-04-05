import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../models/admin_order_model.dart';

class RecentOrdersTable extends StatelessWidget {
  final List<AdminOrderModel> orders;

  const RecentOrdersTable({super.key, required this.orders});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recent Orders',
              style: AppTextStyles.h6.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (orders.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.base),
                child: Center(
                  child: Text(
                    'No orders yet',
                    style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
                  ),
                ),
              )
            else
              ...orders.map((order) => _OrderRow(order: order)),
          ],
        ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  final AdminOrderModel order;

  const _OrderRow({required this.order});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Divider(height: 1, color: AppColors.divider),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          child: Row(
            children: [
              // Order number + customer
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderNumber,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      order.customerName,
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              // Status chip
              _StatusChip(status: order.status),
              const SizedBox(width: AppSpacing.sm),
              // Total
              Text(
                '\$${order.total.toStringAsFixed(2)}',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (color, label) = switch (status) {
      'DELIVERED' => (AppColors.success, 'Delivered'),
      'SHIPPED' => (AppColors.info, 'Shipped'),
      'CONFIRMED' => (AppColors.primary, 'Confirmed'),
      'CANCELLED' => (AppColors.error, 'Cancelled'),
      _ => (AppColors.warning, 'Pending'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
