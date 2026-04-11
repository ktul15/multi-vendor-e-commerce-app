import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/admin_order_cubit.dart';
import '../bloc/admin_order_state.dart';
import '../widgets/order_status_badge.dart';

class OrderListPage extends StatefulWidget {
  const OrderListPage({super.key});

  @override
  State<OrderListPage> createState() => _OrderListPageState();
}

class _OrderListPageState extends State<OrderListPage> {
  Future<void> _doWithSnackbar(Future<String?> Function() action) async {
    final error = await action();
    if (error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _showDateRangePicker(AdminOrderLoaded state) async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: state.startDate != null && state.endDate != null
          ? DateTimeRange(start: state.startDate!, end: state.endDate!)
          : null,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(context)
              .colorScheme
              .copyWith(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      await _doWithSnackbar(
        () => context
            .read<AdminOrderCubit>()
            .applyDateRange(picked.start, picked.end),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminOrderCubit, AdminOrderState>(
      listenWhen: (prev, curr) {
        if (curr is AdminOrderLoaded && prev is AdminOrderLoaded) {
          return curr.transientError != null &&
              curr.transientError != prev.transientError;
        }
        return false;
      },
      listener: (context, state) {
        if (state is AdminOrderLoaded && state.transientError != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.transientError!),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
          context.read<AdminOrderCubit>().clearTransientError();
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(title: const Text('Orders')),
          body: switch (state) {
            AdminOrderInitial() ||
            AdminOrderLoading() =>
              const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            AdminOrderError(:final message) => _ErrorView(message: message),
            AdminOrderLoaded() => _LoadedBody(
                state: state,
                onDoWithSnackbar: _doWithSnackbar,
                onShowDatePicker: () => _showDateRangePicker(state),
              ),
          },
        );
      },
    );
  }
}

// ── Loaded body ───────────────────────────────────────────────────────────────

class _LoadedBody extends StatelessWidget {
  final AdminOrderLoaded state;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;
  final VoidCallback onShowDatePicker;

  const _LoadedBody({
    required this.state,
    required this.onDoWithSnackbar,
    required this.onShowDatePicker,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => context.read<AdminOrderCubit>().refresh(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _FilterBar(
                  state: state,
                  onStatusChanged: (status) => onDoWithSnackbar(
                    () =>
                        context.read<AdminOrderCubit>().filterByStatus(status),
                  ),
                  onShowDatePicker: onShowDatePicker,
                  onClearDateRange: () => onDoWithSnackbar(
                    () => context.read<AdminOrderCubit>().clearDateRange(),
                  ),
                ),
                const SizedBox(height: 16),
                _OrderTable(state: state),
                const SizedBox(height: 12),
                _PaginationBar(
                  state: state,
                  onDoWithSnackbar: onDoWithSnackbar,
                ),
              ],
            ),
          ),
        ),
        if (state.isRefreshing)
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0x33FFFFFF),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Filter bar ────────────────────────────────────────────────────────────────

class _FilterBar extends StatelessWidget {
  final AdminOrderLoaded state;
  final Future<void> Function(String?) onStatusChanged;
  final VoidCallback onShowDatePicker;
  final VoidCallback onClearDateRange;

  const _FilterBar({
    required this.state,
    required this.onStatusChanged,
    required this.onShowDatePicker,
    required this.onClearDateRange,
  });

  String _dateRangeLabel() {
    if (state.startDate == null || state.endDate == null) return 'All Dates';
    final fmt = DateFormat('MMM d');
    final fmtYear = DateFormat('MMM d, yyyy');
    final startYear = state.startDate!.year;
    final endYear = state.endDate!.year;
    if (startYear == endYear) {
      return '${fmt.format(state.startDate!)} – ${fmtYear.format(state.endDate!)}';
    }
    return '${fmtYear.format(state.startDate!)} – ${fmtYear.format(state.endDate!)}';
  }

  @override
  Widget build(BuildContext context) {
    const statuses = [
      null,
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ];
    final hasDateFilter = state.startDate != null || state.endDate != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            for (final s in statuses)
              FilterChip(
                label: Text(s ?? 'All'),
                selected: state.statusFilter == s,
                onSelected: (_) => onStatusChanged(s),
                showCheckmark: false,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: state.statusFilter == s
                      ? Colors.white
                      : AppColors.textPrimary,
                  fontSize: 13,
                  fontWeight: state.statusFilter == s
                      ? FontWeight.w600
                      : FontWeight.w400,
                ),
                side: BorderSide(
                  color: state.statusFilter == s
                      ? AppColors.primary
                      : AppColors.border,
                ),
                backgroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 4),
              ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: onShowDatePicker,
              icon: const Icon(Icons.date_range_rounded, size: 18),
              label: Text(_dateRangeLabel()),
              style: OutlinedButton.styleFrom(
                foregroundColor: hasDateFilter
                    ? AppColors.primary
                    : AppColors.textSecondary,
                side: BorderSide(
                  color: hasDateFilter ? AppColors.primary : AppColors.border,
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
            if (hasDateFilter)
              IconButton(
                tooltip: 'Clear date filter',
                icon: const Icon(
                  Icons.clear_rounded,
                  size: 18,
                  color: AppColors.textSecondary,
                ),
                onPressed: onClearDateRange,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
          ],
        ),
      ],
    );
  }
}

// ── Orders DataTable ──────────────────────────────────────────────────────────

class _OrderTable extends StatelessWidget {
  final AdminOrderLoaded state;

  const _OrderTable({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state.items.isEmpty && !state.isRefreshing) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 64),
          child: Center(
            child: Column(
              children: [
                Icon(
                  Icons.receipt_long_outlined,
                  size: 64,
                  color: AppColors.textSecondary.withAlpha(100),
                ),
                const SizedBox(height: 16),
                Text(
                  'No orders found',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final dateFormat = DateFormat('MMM d, yyyy');

    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columnSpacing: 28,
          headingRowColor: WidgetStateProperty.all(AppColors.background),
          columns: const [
            DataColumn(label: Text('Order #')),
            DataColumn(label: Text('Customer')),
            DataColumn(label: Text('Status')),
            DataColumn(label: Text('Total'), numeric: true),
            DataColumn(label: Text('Date')),
          ],
          rows: state.items.map((order) {
            return DataRow(
              cells: [
                DataCell(
                  InkWell(
                    onTap: () => context.goNamed(
                      AppRoutes.orderDetailName,
                      pathParameters: {'id': order.id},
                    ),
                    child: Text(
                      order.orderNumber,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        decoration: TextDecoration.underline,
                        decorationColor: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                DataCell(Text(order.customerName)),
                DataCell(OrderStatusBadge(status: order.status)),
                DataCell(
                  Text(
                    NumberFormat.currency(symbol: '\$').format(order.total),
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                DataCell(
                  Text(
                    dateFormat.format(order.createdAt.toLocal()),
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ── Pagination bar ────────────────────────────────────────────────────────────

class _PaginationBar extends StatelessWidget {
  final AdminOrderLoaded state;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _PaginationBar({
    required this.state,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    if (state.meta.total == 0) return const SizedBox.shrink();

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          'Showing ${state.fromItem}–${state.toItem} of ${state.meta.total}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(width: 16),
        IconButton(
          tooltip: 'Previous page',
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: state.hasPrevPage && !state.isRefreshing
              ? () => onDoWithSnackbar(
                    () => context.read<AdminOrderCubit>().prevPage(),
                  )
              : null,
        ),
        Text(
          'Page ${state.meta.page} of ${state.meta.totalPages}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        IconButton(
          tooltip: 'Next page',
          icon: const Icon(Icons.chevron_right_rounded),
          onPressed: state.hasNextPage && !state.isRefreshing
              ? () => onDoWithSnackbar(
                    () => context.read<AdminOrderCubit>().nextPage(),
                  )
              : null,
        ),
      ],
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;

  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 72,
            color: AppColors.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load orders',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: AppTextStyles.body
                .copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () => context.read<AdminOrderCubit>().load(),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}

