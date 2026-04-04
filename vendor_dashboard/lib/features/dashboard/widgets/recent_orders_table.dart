import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/vendor_order.dart';

class RecentOrdersTable extends StatelessWidget {
  const RecentOrdersTable({super.key, required this.orders});

  final List<VendorOrder> orders;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Recent Orders', style: AppTextStyles.h3),
                TextButton(
                  onPressed: () => context.go(AppRoutes.orders),
                  child: const Text('View all'),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            if (orders.isEmpty)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: Center(child: Text('No orders yet.')),
              )
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(AppColors.background),
                  columns: const [
                    DataColumn(label: Text('Order #')),
                    DataColumn(label: Text('Customer')),
                    DataColumn(label: Text('Status')),
                    DataColumn(label: Text('Total'), numeric: true),
                    DataColumn(label: Text('Date')),
                  ],
                  rows: orders.map((o) {
                    return DataRow(
                      cells: [
                        DataCell(Text(o.orderNumber)),
                        DataCell(Text(o.customerName ?? '—')),
                        DataCell(_StatusChip(status: o.status)),
                        DataCell(Text('\$${o.subtotal.toStringAsFixed(2)}')),
                        DataCell(
                          Text(
                            '${o.createdAt.year}-'
                            '${o.createdAt.month.toString().padLeft(2, '0')}-'
                            '${o.createdAt.day.toString().padLeft(2, '0')}',
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  static const _colors = <String, Color>{
    'PENDING': AppColors.warning,
    'CONFIRMED': AppColors.primary,
    'PROCESSING': AppColors.secondary,
    'SHIPPED': Color(0xFF6366F1),
    'DELIVERED': AppColors.success,
    'CANCELLED': AppColors.error,
    'REFUNDED': AppColors.neutral500,
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[status] ?? AppColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
