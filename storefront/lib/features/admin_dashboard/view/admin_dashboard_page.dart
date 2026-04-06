import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/admin_dashboard_cubit.dart';
import '../bloc/admin_dashboard_state.dart';
import '../models/admin_stats_model.dart';
import '../widgets/admin_sidebar.dart';
import '../widgets/recent_orders_table.dart';
import '../widgets/revenue_chart.dart';
import '../widgets/stat_card.dart';

final _currencyFormat = NumberFormat.currency(
  locale: 'en_US',
  symbol: '\$',
  decimalDigits: 2,
);

class AdminDashboardPage extends StatelessWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<AdminDashboardCubit>()..load(),
      child: const _AdminDashboardView(),
    );
  }
}

class _AdminDashboardView extends StatelessWidget {
  const _AdminDashboardView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminDashboardCubit, AdminDashboardState>(
      // Only show snackbar when revenueError changes to a new non-null value.
      listenWhen: (prev, curr) {
        if (curr is AdminDashboardLoaded && prev is AdminDashboardLoaded) {
          return curr.revenueError != null &&
              curr.revenueError != prev.revenueError;
        }
        return false;
      },
      listener: (context, state) {
        if (state is AdminDashboardLoaded && state.revenueError != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.revenueError!),
              behavior: SnackBarBehavior.floating,
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          drawer: const AdminSidebar(currentRoute: AppRoutes.adminDashboard),
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
            scrolledUnderElevation: 1,
            title: const Text('Overview'),
            titleTextStyle:
                AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
          ),
          body: switch (state) {
            AdminDashboardInitial() ||
            AdminDashboardLoading() =>
              const Center(child: CircularProgressIndicator()),
            AdminDashboardError(:final message) =>
              _ErrorBody(message: message),
            AdminDashboardLoaded() => _LoadedBody(state: state),
          },
        );
      },
    );
  }
}

// ── Loaded body ───────────────────────────────────────────────────────────────

class _LoadedBody extends StatelessWidget {
  final AdminDashboardLoaded state;

  const _LoadedBody({required this.state});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => context.read<AdminDashboardCubit>().refresh(),
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.base),
        children: [
          // ── Stat cards ──
          _StatCards(stats: state.stats),
          const SizedBox(height: AppSpacing.base),

          // ── Revenue chart ──
          RevenueChart(
            revenue: state.revenue,
            selectedPeriod: state.selectedPeriod,
            isLoading: state.isRevenueLoading,
            onPeriodChanged: (p) =>
                context.read<AdminDashboardCubit>().changePeriod(p),
          ),
          const SizedBox(height: AppSpacing.base),

          // ── Recent orders ──
          RecentOrdersTable(orders: state.recentOrders),
          const SizedBox(height: AppSpacing.xl),
        ],
      ),
    );
  }
}

// ── Stat cards — 2×2 grid using Rows to avoid GridView shrinkWrap issues ─────

class _StatCards extends StatelessWidget {
  final AdminStatsModel stats;

  const _StatCards({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: StatCard(
                title: 'Total Users',
                value: stats.totalUsers.toString(),
                icon: Icons.people_outline_rounded,
                iconColor: AppColors.info,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: StatCard(
                title: 'Vendors',
                value: stats.totalVendors.toString(),
                icon: Icons.storefront_outlined,
                iconColor: AppColors.success,
                badgeCount: stats.pendingVendors,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.sm),
        Row(
          children: [
            Expanded(
              child: StatCard(
                title: 'Total Orders',
                value: stats.totalOrders.toString(),
                icon: Icons.receipt_long_outlined,
                iconColor: AppColors.warning,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: StatCard(
                title: 'Revenue',
                value: _currencyFormat.format(stats.platformRevenue),
                icon: Icons.attach_money_rounded,
                iconColor: AppColors.primary,
              ),
            ),
          ],
        ),
      ],
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
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 72, color: Colors.grey),
            const SizedBox(height: AppSpacing.base),
            Text(
              'Something went wrong',
              style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: () => context.read<AdminDashboardCubit>().refresh(),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
