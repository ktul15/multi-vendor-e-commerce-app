import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/orders_cubit.dart';
import '../bloc/orders_state.dart';
import '../../../shared/models/vendor_order.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../widgets/orders_skeleton.dart';
import '../widgets/orders_table.dart';
import '../widgets/update_status_dialog.dart';

const _statusFilters = [
  null,
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const _statusLabels = {
  null: 'All',
  'PENDING': 'Pending',
  'CONFIRMED': 'Confirmed',
  'PROCESSING': 'Processing',
  'SHIPPED': 'Shipped',
  'DELIVERED': 'Delivered',
  'CANCELLED': 'Cancelled',
};

class OrdersPage extends StatelessWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<OrdersCubit>()..load(),
      child: const _OrdersView(),
    );
  }
}

class _OrdersView extends StatelessWidget {
  const _OrdersView();

  Future<void> _showUpdateDialog(
    BuildContext context,
    VendorOrder order,
  ) async {
    final result = await showDialog<StatusUpdateResult>(
      context: context,
      builder: (_) => UpdateStatusDialog(order: order),
    );
    if (result != null && context.mounted) {
      await context.read<OrdersCubit>().updateStatus(
            order.id,
            result.status,
            trackingNumber: result.trackingNumber,
            trackingCarrier: result.trackingCarrier,
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocConsumer<OrdersCubit, OrdersState>(
        listener: (context, state) {
          if (state is OrdersError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          final activeStatus =
              state is OrdersLoaded ? state.activeStatus : null;

          return Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Orders', style: AppTextStyles.h2),
                const SizedBox(height: AppSpacing.md),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _statusFilters.map((status) {
                      final isActive = activeStatus == status;
                      return Padding(
                        padding: const EdgeInsets.only(right: AppSpacing.sm),
                        child: FilterChip(
                          label: Text(_statusLabels[status] ?? status ?? 'All'),
                          selected: isActive,
                          onSelected: (_) =>
                              context.read<OrdersCubit>().load(status: status),
                          selectedColor:
                              AppColors.primary.withValues(alpha: 0.15),
                          checkmarkColor: AppColors.primary,
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Expanded(
                  child: Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: switch (state) {
                        OrdersLoading() || OrdersInitial() =>
                          const SkeletonContainer(child: OrdersSkeleton()),
                        OrdersError(:final message) => ErrorState(
                            message: message,
                            onRetry: () => context.read<OrdersCubit>().load(),
                          ),
                        OrdersLoaded(:final orders) => OrdersTable(
                            orders: orders,
                            onUpdateStatus: (o) =>
                                _showUpdateDialog(context, o),
                          ),
                        _ => const SizedBox(),
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
