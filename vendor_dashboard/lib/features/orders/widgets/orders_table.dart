import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/vendor_order.dart';

class OrdersTable extends StatelessWidget {
  const OrdersTable({
    super.key,
    required this.orders,
    required this.onUpdateStatus,
  });

  final List<VendorOrder> orders;
  final void Function(VendorOrder) onUpdateStatus;

  static const _terminalStatuses = {'DELIVERED', 'CANCELLED', 'REFUNDED'};

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Text('No orders found.'),
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowColor: WidgetStateProperty.all(AppColors.background),
        columns: const [
          DataColumn(label: Text('Order #')),
          DataColumn(label: Text('Customer')),
          DataColumn(label: Text('Items'), numeric: true),
          DataColumn(label: Text('Total'), numeric: true),
          DataColumn(label: Text('Status')),
          DataColumn(label: Text('Date')),
          DataColumn(label: Text('Actions')),
        ],
        rows: orders.map((o) {
          final canUpdate = !_terminalStatuses.contains(o.status);
          return DataRow(
            cells: [
              DataCell(Text(o.orderNumber)),
              DataCell(
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 160),
                  child: Text(
                    o.customerName ?? o.customerEmail ?? '—',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              DataCell(Text(o.items.length.toString())),
              DataCell(Text('\$${o.subtotal.toStringAsFixed(2)}')),
              DataCell(_StatusChip(status: o.status)),
              DataCell(
                Text(
                  '${o.createdAt.year}-'
                  '${o.createdAt.month.toString().padLeft(2, '0')}-'
                  '${o.createdAt.day.toString().padLeft(2, '0')}',
                ),
              ),
              DataCell(
                canUpdate
                    ? TextButton(
                        onPressed: () => onUpdateStatus(o),
                        child: const Text('Update Status'),
                      )
                    : const Text('—', style: TextStyle(color: AppColors.textSecondary)),
              ),
            ],
          );
        }).toList(),
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
