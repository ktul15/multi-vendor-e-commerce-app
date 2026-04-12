import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/notification_model.dart';

class NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onTap;

  const NotificationTile({
    super.key,
    required this.notification,
    required this.onTap,
  });

  IconData _iconForType(String type) {
    return switch (type) {
      'ORDER_CONFIRMED' => Icons.check_circle_outline,
      'ORDER_PROCESSING' => Icons.settings_outlined,
      'ORDER_SHIPPED' => Icons.local_shipping_outlined,
      'ORDER_DELIVERED' => Icons.inventory_2_outlined,
      'ORDER_CANCELLED' => Icons.cancel_outlined,
      'ORDER_REFUNDED' => Icons.currency_exchange_outlined,
      'PROMO' => Icons.local_offer_outlined,
      _ => Icons.notifications_outlined,
    };
  }

  Color _colorForType(String type) {
    return switch (type) {
      'ORDER_CONFIRMED' => Colors.green,
      'ORDER_PROCESSING' => Colors.orange,
      'ORDER_SHIPPED' => Colors.blue,
      'ORDER_DELIVERED' => Colors.teal,
      'ORDER_CANCELLED' => Colors.red,
      'ORDER_REFUNDED' => Colors.purple,
      'PROMO' => Colors.amber,
      _ => AppColors.textSecondary,
    };
  }

  String _timeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }

  @override
  Widget build(BuildContext context) {
    final color = _colorForType(notification.type);

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.base,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          color: notification.isRead ? null : color.withAlpha(15),
          border: Border(
            left: BorderSide(
              color: notification.isRead ? Colors.transparent : color,
              width: 3,
            ),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(AppSpacing.sm),
              ),
              child: Icon(_iconForType(notification.type), color: color, size: 20),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: notification.isRead
                        ? AppTextStyles.body
                        : AppTextStyles.body.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    notification.body,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    _timeAgo(notification.createdAt),
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            if (!notification.isRead)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
