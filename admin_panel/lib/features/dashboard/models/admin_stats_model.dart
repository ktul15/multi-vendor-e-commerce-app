import 'package:equatable/equatable.dart';
import 'dashboard_json_parsers.dart';

class AdminStatsModel extends Equatable {
  final int totalUsers;
  final int bannedUsers;
  final int totalVendors;
  final int pendingVendors;
  final int totalProducts;
  final int totalOrders;
  final double platformRevenue;

  const AdminStatsModel({
    required this.totalUsers,
    required this.bannedUsers,
    required this.totalVendors,
    required this.pendingVendors,
    required this.totalProducts,
    required this.totalOrders,
    required this.platformRevenue,
  });

  factory AdminStatsModel.fromJson(Map<String, dynamic> json) {
    return AdminStatsModel(
      totalUsers: readDashboardInt(json['totalUsers']),
      bannedUsers: readDashboardInt(json['bannedUsers']),
      totalVendors: readDashboardInt(json['totalVendors']),
      pendingVendors: readDashboardInt(json['pendingVendors']),
      totalProducts: readDashboardInt(json['totalProducts']),
      totalOrders: readDashboardInt(json['totalOrders']),
      platformRevenue: readDashboardDouble(json['platformRevenue']),
    );
  }

  @override
  List<Object?> get props => [
    totalUsers,
    bannedUsers,
    totalVendors,
    pendingVendors,
    totalProducts,
    totalOrders,
    platformRevenue,
  ];
}
