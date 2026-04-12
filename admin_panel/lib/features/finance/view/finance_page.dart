import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../features/dashboard/models/revenue_model.dart';
import '../../../features/dashboard/widgets/revenue_chart.dart';
import '../bloc/finance_cubit.dart';
import '../bloc/finance_state.dart';
import '../models/commission_model.dart';

final _currencyFormat = NumberFormat.currency(symbol: '\$');

class FinancePage extends StatefulWidget {
  const FinancePage({super.key});

  @override
  State<FinancePage> createState() => _FinancePageState();
}

class _FinancePageState extends State<FinancePage> {
  Future<void> _showDateRangePicker(FinanceLoaded state) async {
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
      await context
          .read<FinanceCubit>()
          .applyDateRange(picked.start, picked.end);
    }
  }

  Future<void> _showEditDialog(
    BuildContext context,
    double currentRate,
  ) async {
    final controller =
        TextEditingController(text: currentRate.toStringAsFixed(2));
    String? errorText;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              title: const Text('Edit Commission Rate'),
              content: TextField(
                controller: controller,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  label: const Text('Rate'),
                  suffixText: '%',
                  errorText: errorText,
                  helperText: 'Enter a value between 0 and 100',
                ),
                onChanged: (_) => setDialogState(() => errorText = null),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () {
                    final raw = controller.text.trim();
                    final parsed = double.tryParse(raw);
                    if (parsed == null || parsed < 0 || parsed > 100) {
                      setDialogState(
                        () => errorText = 'Enter a number between 0 and 100',
                      );
                      return;
                    }
                    Navigator.of(dialogContext).pop();
                    // Use the outer context which has the BlocProvider.
                    context.read<FinanceCubit>().saveCommission(parsed);
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
    controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<FinanceCubit, FinanceState>(
      listenWhen: (prev, curr) {
        if (curr is FinanceLoaded && prev is FinanceLoaded) {
          final newRevenueError = curr.revenueError != null &&
              curr.revenueError != prev.revenueError;
          final newCommissionError = curr.commissionError != null &&
              curr.commissionError != prev.commissionError;
          final newSuccess = curr.commissionSuccess != null &&
              curr.commissionSuccess != prev.commissionSuccess;
          return newRevenueError || newCommissionError || newSuccess;
        }
        return false;
      },
      listener: (context, state) {
        if (state is! FinanceLoaded) return;
        if (state.revenueError != null) {
          _showSnackBar(context, state.revenueError!, isError: true);
          context.read<FinanceCubit>().clearRevenueError();
        } else if (state.commissionError != null) {
          _showSnackBar(context, state.commissionError!, isError: true);
          context.read<FinanceCubit>().clearCommissionError();
        } else if (state.commissionSuccess != null) {
          _showSnackBar(context, state.commissionSuccess!, isError: false);
          context.read<FinanceCubit>().clearCommissionSuccess();
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
            scrolledUnderElevation: 1,
            title: const Text('Finance'),
            titleTextStyle:
                AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
          ),
          body: switch (state) {
            FinanceInitial() ||
            FinanceLoading() =>
              const Center(child: CircularProgressIndicator()),
            FinanceError(:final message) => _ErrorBody(message: message),
            FinanceLoaded() => _FinanceBody(
                state: state,
                onShowDatePicker: () => _showDateRangePicker(state),
                onEditCommission: (rate) => _showEditDialog(context, rate),
              ),
          },
        );
      },
    );
  }

  void _showSnackBar(BuildContext context, String message,
      {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor:
            isError ? AppColors.error : AppColors.success,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

// ── Finance body ──────────────────────────────────────────────────────────────

class _FinanceBody extends StatelessWidget {
  final FinanceLoaded state;
  final VoidCallback onShowDatePicker;
  final ValueChanged<double> onEditCommission;

  const _FinanceBody({
    required this.state,
    required this.onShowDatePicker,
    required this.onEditCommission,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => context.read<FinanceCubit>().refresh(),
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          // ── Revenue Reports ───────────────────────────────────────────────
          Text(
            'Revenue',
            style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.sm),
          _DateRangeBar(
            state: state,
            onShowDatePicker: onShowDatePicker,
            onClearDateRange: () =>
                context.read<FinanceCubit>().clearDateRange(),
          ),
          const SizedBox(height: AppSpacing.base),
          RevenueChart(
            revenue: state.revenue,
            selectedPeriod: state.selectedPeriod,
            isLoading: state.isRevenueLoading,
            onPeriodChanged: (p) =>
                context.read<FinanceCubit>().changePeriod(p),
          ),
          const SizedBox(height: AppSpacing.sm),
          _RevenueSummaryRow(revenue: state.revenue),
          const SizedBox(height: AppSpacing.xl),

          // ── Commission Settings ───────────────────────────────────────────
          Text(
            'Commission Settings',
            style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
          ),
          const SizedBox(height: AppSpacing.sm),
          _CommissionCard(
            commission: state.commission,
            isSaving: state.isCommissionSaving,
            onEdit: () => onEditCommission(state.commission.rate),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }
}

// ── Date range bar ────────────────────────────────────────────────────────────

class _DateRangeBar extends StatelessWidget {
  final FinanceLoaded state;
  final VoidCallback onShowDatePicker;
  final VoidCallback onClearDateRange;

  const _DateRangeBar({
    required this.state,
    required this.onShowDatePicker,
    required this.onClearDateRange,
  });

  String _dateRangeLabel() {
    if (state.startDate == null || state.endDate == null) {
      return 'Custom Range';
    }
    final fmt = DateFormat('MMM d');
    final fmtYear = DateFormat('MMM d, yyyy');
    if (state.startDate!.year == state.endDate!.year) {
      return '${fmt.format(state.startDate!)} – ${fmtYear.format(state.endDate!)}';
    }
    return '${fmtYear.format(state.startDate!)} – ${fmtYear.format(state.endDate!)}';
  }

  @override
  Widget build(BuildContext context) {
    final hasDateFilter = state.startDate != null || state.endDate != null;

    return Row(
      children: [
        OutlinedButton.icon(
          onPressed: onShowDatePicker,
          icon: const Icon(Icons.date_range_rounded, size: 18),
          label: Text(_dateRangeLabel()),
          style: OutlinedButton.styleFrom(
            foregroundColor:
                hasDateFilter ? AppColors.primary : AppColors.textSecondary,
            side: BorderSide(
              color: hasDateFilter ? AppColors.primary : AppColors.border,
            ),
          ),
        ),
        if (hasDateFilter) ...[
          const SizedBox(width: 4),
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
        if (state.isRevenueLoading) ...[
          const SizedBox(width: AppSpacing.sm),
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primary,
            ),
          ),
        ],
      ],
    );
  }
}

// ── Revenue summary row ───────────────────────────────────────────────────────

class _RevenueSummaryRow extends StatelessWidget {
  final RevenueModel revenue;

  const _RevenueSummaryRow({required this.revenue});

  @override
  Widget build(BuildContext context) {
    final totalRevenue =
        revenue.series.fold(0.0, (sum, p) => sum + p.revenue);
    final totalOrders =
        revenue.series.fold(0, (sum, p) => sum + p.orderCount);

    return Row(
      children: [
        Expanded(
          child: _SummaryTile(
            label: 'Total Revenue',
            value: _currencyFormat.format(totalRevenue),
            icon: Icons.attach_money_rounded,
            color: AppColors.success,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _SummaryTile(
            label: 'Total Orders',
            value: totalOrders.toString(),
            icon: Icons.receipt_long_rounded,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: AppSpacing.sm),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
                ),
                Text(
                  label,
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Commission card ───────────────────────────────────────────────────────────

class _CommissionCard extends StatelessWidget {
  final CommissionModel commission;
  final bool isSaving;
  final VoidCallback onEdit;

  const _CommissionCard({
    required this.commission,
    required this.isSaving,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final sourceLabel = commission.source == 'database'
        ? 'Set via admin panel'
        : 'Using environment default';

    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Platform Commission Rate',
                      style: AppTextStyles.body
                          .copyWith(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${commission.rate.toStringAsFixed(2)}%',
                      style: AppTextStyles.h3
                          .copyWith(color: AppColors.primary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      sourceLabel,
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
                if (isSaving)
                  const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  )
                else
                  FilledButton.icon(
                    onPressed: onEdit,
                    icon: const Icon(Icons.edit_rounded, size: 18),
                    label: const Text('Edit Rate'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Error body ────────────────────────────────────────────────────────────────

class _ErrorBody extends StatelessWidget {
  final String message;

  const _ErrorBody({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 72, color: AppColors.error),
            const SizedBox(height: AppSpacing.base),
            Text('Failed to load finance data', style: AppTextStyles.h5),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            FilledButton.icon(
              onPressed: () => context.read<FinanceCubit>().load(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
