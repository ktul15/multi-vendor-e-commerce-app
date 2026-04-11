import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../features/dashboard/models/admin_order_model.dart';
import 'order_status_badge.dart';

final _currencyFormat = NumberFormat.currency(symbol: '\$');

class OrderRow extends StatelessWidget {
  final AdminOrderModel order;
  final VoidCallback onTap;

  const OrderRow({super.key, required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final initials = order.customerName.isNotEmpty
        ? order.customerName[0].toUpperCase()
        : '?';

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: AppColors.primary.withAlpha(30),
        child: Text(
          initials,
          style: AppTextStyles.body.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      title: Text(
        order.orderNumber,
        style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        order.customerName,
        style: AppTextStyles.caption.copyWith(color: AppColors.textSecondary),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          OrderStatusBadge(status: order.status),
          const SizedBox(height: 4),
          Text(
            _currencyFormat.format(order.total),
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
