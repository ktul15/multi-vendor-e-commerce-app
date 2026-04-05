import 'package:equatable/equatable.dart';

class RevenueDataPoint extends Equatable {
  final DateTime periodStart;
  final int orderCount;
  final double revenue;

  const RevenueDataPoint({
    required this.periodStart,
    required this.orderCount,
    required this.revenue,
  });

  factory RevenueDataPoint.fromJson(Map<String, dynamic> json) {
    return RevenueDataPoint(
      periodStart: DateTime.parse(json['periodStart'] as String),
      orderCount: json['orderCount'] as int,
      revenue: double.parse(json['revenue'].toString()),
    );
  }

  @override
  List<Object?> get props => [periodStart, orderCount, revenue];
}

class RevenueModel extends Equatable {
  final String period;
  final List<RevenueDataPoint> series;
  final DateTime startDate;
  final DateTime endDate;

  const RevenueModel({
    required this.period,
    required this.series,
    required this.startDate,
    required this.endDate,
  });

  factory RevenueModel.fromJson(Map<String, dynamic> json) {
    final dateRange = json['dateRange'] as Map<String, dynamic>;
    return RevenueModel(
      period: json['period'] as String,
      series: (json['series'] as List<dynamic>)
          .map((e) => RevenueDataPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
      startDate: DateTime.parse(dateRange['startDate'] as String),
      endDate: DateTime.parse(dateRange['endDate'] as String),
    );
  }

  @override
  List<Object?> get props => [period, series, startDate, endDate];
}
