import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/earnings_cubit.dart';
import '../bloc/earnings_state.dart';
import '../../../shared/widgets/revenue_chart.dart';
import '../widgets/top_products_table.dart';
import '../../dashboard/widgets/summary_cards.dart';

class EarningsPage extends StatelessWidget {
  const EarningsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<EarningsCubit>()..load(),
      child: const _EarningsView(),
    );
  }
}

class _EarningsView extends StatelessWidget {
  const _EarningsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocConsumer<EarningsCubit, EarningsState>(
        listener: (context, state) {
          if (state is EarningsError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is EarningsLoading || state is EarningsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is EarningsError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: AppSpacing.md),
                  ElevatedButton(
                    onPressed: () => context.read<EarningsCubit>().load(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final loaded = state as EarningsLoaded;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Earnings', style: AppTextStyles.h2),
                const SizedBox(height: AppSpacing.lg),
                SummaryCards(summary: loaded.summary),
                const SizedBox(height: AppSpacing.lg),
                RevenueChart(
                  title: 'Revenue',
                  salesData: loaded.salesData,
                  period: loaded.period,
                  onPeriodChanged: (p) =>
                      context.read<EarningsCubit>().load(period: p),
                ),
                const SizedBox(height: AppSpacing.lg),
                TopProductsTable(products: loaded.topProducts),
              ],
            ),
          );
        },
      ),
    );
  }
}
