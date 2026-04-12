import 'package:equatable/equatable.dart';
import '../../../shared/models/analytics_summary.dart';
import '../../../shared/models/sales_point.dart';
import '../../../shared/models/vendor_order.dart';

abstract class DashboardState extends Equatable {
  const DashboardState();

  @override
  List<Object?> get props => [];
}

class DashboardInitial extends DashboardState {}

class DashboardLoading extends DashboardState {}

class DashboardLoaded extends DashboardState {
  final AnalyticsSummary summary;
  final SalesData salesData;
  final List<VendorOrder> recentOrders;

  const DashboardLoaded({
    required this.summary,
    required this.salesData,
    required this.recentOrders,
  });

  @override
  List<Object?> get props => [summary, salesData, recentOrders];
}

class DashboardError extends DashboardState {
  final String message;

  const DashboardError(this.message);

  @override
  List<Object?> get props => [message];
}
