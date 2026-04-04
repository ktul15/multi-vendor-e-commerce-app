import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../models/sales_point.dart';

/// Unified revenue line chart used by both Dashboard and Earnings pages.
///
/// - [title]: card heading (e.g. "Revenue — last 30 days").
/// - [salesData]: time-series data to plot.
/// - [period]: currently selected period; required when [onPeriodChanged] is provided.
/// - [onPeriodChanged]: if non-null, renders a period toggle (Daily / Weekly / Monthly).
class RevenueChart extends StatelessWidget {
  const RevenueChart({
    super.key,
    required this.title,
    required this.salesData,
    this.period,
    this.onPeriodChanged,
  });

  final String title;
  final SalesData salesData;
  final String? period;
  final void Function(String)? onPeriodChanged;

  @override
  Widget build(BuildContext context) {
    final series = salesData.series;
    final hasPeriodToggle = onPeriodChanged != null && period != null;

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
                Text(title, style: AppTextStyles.h3),
                if (hasPeriodToggle)
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'day', label: Text('Daily')),
                      ButtonSegment(value: 'week', label: Text('Weekly')),
                      ButtonSegment(value: 'month', label: Text('Monthly')),
                    ],
                    selected: {period!},
                    onSelectionChanged: (s) => onPeriodChanged!(s.first),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              height: 200,
              child: series.isEmpty
                  ? const Center(child: Text('No data for this period.'))
                  : _RevenueLineChart(series: series, showDots: series.length <= 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _RevenueLineChart extends StatelessWidget {
  const _RevenueLineChart({required this.series, required this.showDots});

  final List<SalesPoint> series;
  final bool showDots;

  @override
  Widget build(BuildContext context) {
    final spots = series.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.revenue);
    }).toList();

    final maxY = series
        .map((s) => s.revenue)
        .fold<double>(0, (a, b) => a > b ? a : b);

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxY * 1.2 + 1,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => const FlLine(
            color: AppColors.border,
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 52,
              getTitlesWidget: (value, meta) => Text(
                '\$${value.toStringAsFixed(0)}',
                style: AppTextStyles.caption
                    .copyWith(color: AppColors.textSecondary),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: (series.length / 6).ceilToDouble(),
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= series.length) return const SizedBox();
                final label = series[idx].periodStart.substring(5);
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    label,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                  ),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: AppColors.primary,
            barWidth: 2.5,
            dotData: FlDotData(
              show: showDots,
              getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(
                radius: 3,
                color: AppColors.primary,
                strokeColor: Colors.white,
                strokeWidth: 2,
              ),
            ),
            belowBarData: BarAreaData(
              show: true,
              color: AppColors.primary.withValues(alpha: 0.08),
            ),
          ),
        ],
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipItems: (touchedSpots) => touchedSpots.map((s) {
              final point = series[s.spotIndex];
              return LineTooltipItem(
                '${point.periodStart}\n\$${point.revenue.toStringAsFixed(2)}',
                AppTextStyles.caption.copyWith(color: Colors.white),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
