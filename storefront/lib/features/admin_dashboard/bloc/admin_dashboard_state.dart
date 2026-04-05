import 'package:equatable/equatable.dart';
import '../models/admin_order_model.dart';
import '../models/admin_stats_model.dart';
import '../models/revenue_model.dart';

sealed class AdminDashboardState extends Equatable {
  const AdminDashboardState();

  @override
  List<Object?> get props => [];
}

class AdminDashboardInitial extends AdminDashboardState {
  const AdminDashboardInitial();
}

class AdminDashboardLoading extends AdminDashboardState {
  const AdminDashboardLoading();
}

class AdminDashboardLoaded extends AdminDashboardState {
  final AdminStatsModel stats;
  final RevenueModel revenue;
  final List<AdminOrderModel> recentOrders;
  final String selectedPeriod;
  final bool isRevenueLoading;
  // Non-null when a period-change fetch fails; cleared on the next successful
  // load. The page listens for changes to this field to show a one-off snackbar.
  final String? revenueError;

  const AdminDashboardLoaded({
    required this.stats,
    required this.revenue,
    required this.recentOrders,
    this.selectedPeriod = 'day',
    this.isRevenueLoading = false,
    this.revenueError,
  });

  AdminDashboardLoaded copyWith({
    AdminStatsModel? stats,
    RevenueModel? revenue,
    List<AdminOrderModel>? recentOrders,
    String? selectedPeriod,
    bool? isRevenueLoading,
    String? revenueError,
    bool clearRevenueError = false,
  }) {
    return AdminDashboardLoaded(
      stats: stats ?? this.stats,
      revenue: revenue ?? this.revenue,
      recentOrders: recentOrders ?? this.recentOrders,
      selectedPeriod: selectedPeriod ?? this.selectedPeriod,
      isRevenueLoading: isRevenueLoading ?? this.isRevenueLoading,
      revenueError: clearRevenueError ? null : (revenueError ?? this.revenueError),
    );
  }

  @override
  List<Object?> get props => [
        stats,
        revenue,
        recentOrders,
        selectedPeriod,
        isRevenueLoading,
        revenueError,
      ];
}

class AdminDashboardError extends AdminDashboardState {
  final String message;

  const AdminDashboardError(this.message);

  @override
  List<Object?> get props => [message];
}
