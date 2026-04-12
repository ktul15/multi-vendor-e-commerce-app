import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/analytics_summary.dart';

class SummaryCards extends StatelessWidget {
  const SummaryCards({super.key, required this.summary});

  final AnalyticsSummary summary;

  @override
  Widget build(BuildContext context) {
    final cards = [
      _CardData(
        title: 'Total Orders',
        value: summary.orders.totalOrders.toString(),
        icon: Icons.shopping_bag_outlined,
        color: AppColors.primary,
      ),
      _CardData(
        title: 'Gross Revenue',
        value: '\$${summary.revenue.gross.toStringAsFixed(2)}',
        icon: Icons.attach_money,
        color: AppColors.success,
      ),
      _CardData(
        title: 'Net Earnings',
        value: '\$${summary.revenue.net.toStringAsFixed(2)}',
        icon: Icons.account_balance_wallet_outlined,
        color: AppColors.secondary,
      ),
      _CardData(
        title: 'Commission Paid',
        value: '\$${summary.revenue.commission.toStringAsFixed(2)}',
        icon: Icons.percent,
        color: AppColors.error,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxis = constraints.maxWidth < 600
            ? 2
            : constraints.maxWidth < 900
                ? 2
                : 4;
        return GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: crossAxis,
          crossAxisSpacing: AppSpacing.md,
          mainAxisSpacing: AppSpacing.md,
          childAspectRatio: 1.8,
          children: cards.map((c) => _SummaryCard(data: c)).toList(),
        );
      },
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.data});

  final _CardData data;

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
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Icon(data.icon, color: data.color, size: 20),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    data.title,
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              data.value,
              style: AppTextStyles.h2.copyWith(color: AppColors.textPrimary),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardData {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _CardData({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });
}
