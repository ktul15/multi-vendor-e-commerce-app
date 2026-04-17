import 'package:equatable/equatable.dart';

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
      totalUsers: json['totalUsers'] as int,
      bannedUsers: json['bannedUsers'] as int,
      totalVendors: json['totalVendors'] as int,
      pendingVendors: json['pendingVendors'] as int,
      totalProducts: json['totalProducts'] as int,
      totalOrders: json['totalOrders'] as int,
      platformRevenue: json['platformRevenue'] is String
          ? double.tryParse(json['platformRevenue'] as String) ?? 0.0
          : (json['platformRevenue'] as num?)?.toDouble() ?? 0.0,
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
