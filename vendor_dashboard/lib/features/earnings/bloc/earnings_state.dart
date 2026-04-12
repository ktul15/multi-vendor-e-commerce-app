import 'package:equatable/equatable.dart';
import '../../../shared/models/analytics_summary.dart';
import '../../../shared/models/sales_point.dart';
import '../../../shared/models/top_product.dart';

abstract class EarningsState extends Equatable {
  const EarningsState();

  @override
  List<Object?> get props => [];
}

class EarningsInitial extends EarningsState {}

class EarningsLoading extends EarningsState {}

class EarningsLoaded extends EarningsState {
  final AnalyticsSummary summary;
  final SalesData salesData;
  final String period;
  final List<TopProduct> topProducts;

  const EarningsLoaded({
    required this.summary,
    required this.salesData,
    required this.period,
    required this.topProducts,
  });

  @override
  List<Object?> get props => [summary, salesData, period, topProducts];
}

class EarningsError extends EarningsState {
  final String message;

  const EarningsError(this.message);

  @override
  List<Object?> get props => [message];
}
