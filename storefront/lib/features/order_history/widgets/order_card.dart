import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/order_model.dart';
import 'order_status_badge.dart';

class OrderCard extends StatelessWidget {
  final OrderModel order;

  const OrderCard({super.key, required this.order});

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  static String _formatDate(DateTime dt) =>
      '${_months[dt.month - 1]} ${dt.day}, ${dt.year}';

  @override
  Widget build(BuildContext context) {
    final dateStr = _formatDate(order.createdAt);
    final itemCount = order.totalItemCount;

    return Card(
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.base,
        vertical: AppSpacing.sm,
      ),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      color: AppColors.surface,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.pushNamed(
          AppRoutes.orderDetailName,
          pathParameters: {'id': order.id},
        ),
        child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header: order number + status badge ──
            Row(
              children: [
                Expanded(
                  child: Text(
                    order.orderNumber,
                    style: AppTextStyles.h6,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                OrderStatusBadge(status: order.overallStatus),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),

            // ── Date + item count ──
            Row(
              children: [
                const Icon(
                  Icons.calendar_today_outlined,
                  size: 14,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(dateStr, style: AppTextStyles.caption),
                const SizedBox(width: AppSpacing.base),
                const Icon(
                  Icons.shopping_bag_outlined,
                  size: 14,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  '$itemCount ${itemCount == 1 ? 'item' : 'items'}',
                  style: AppTextStyles.caption,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // ── Footer: total ──
            Text(
              '\$${order.total.toStringAsFixed(2)}',
              style: AppTextStyles.h5.copyWith(color: AppColors.primary),
            ),
          ],
        ),
      ),
      ),
    );
  }
}
