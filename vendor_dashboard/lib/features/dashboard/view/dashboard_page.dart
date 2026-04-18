import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/dashboard_cubit.dart';
import '../bloc/dashboard_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../widgets/dashboard_skeleton.dart';
import '../widgets/summary_cards.dart';
import '../widgets/revenue_chart.dart';
import '../widgets/recent_orders_table.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<DashboardCubit>()..load(),
      child: const _DashboardView(),
    );
  }
}

class _DashboardView extends StatelessWidget {
  const _DashboardView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (context, state) {
        if (state is DashboardLoading || state is DashboardInitial) {
          return const SkeletonContainer(child: DashboardSkeleton());
        }

        if (state is DashboardError) {
          return ErrorState(
            message: state.message,
            onRetry: () => context.read<DashboardCubit>().load(),
          );
        }

        final loaded = state as DashboardLoaded;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Dashboard', style: AppTextStyles.h2),
              const SizedBox(height: AppSpacing.lg),
              SummaryCards(summary: loaded.summary),
              const SizedBox(height: AppSpacing.lg),
              RevenueChart(
                title: 'Revenue — last 30 days',
                salesData: loaded.salesData,
              ),
              const SizedBox(height: AppSpacing.lg),
              RecentOrdersTable(orders: loaded.recentOrders),
            ],
          ),
        );
      },
    );
  }
}
