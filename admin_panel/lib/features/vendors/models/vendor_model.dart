import 'package:equatable/equatable.dart';

double? _readNullableDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

class VendorOwnerModel extends Equatable {
  final String id;
  final String name;
  final String email;
  final bool isBanned;

  const VendorOwnerModel({
    required this.id,
    required this.name,
    required this.email,
    required this.isBanned,
  });

  factory VendorOwnerModel.fromJson(Map<String, dynamic> json) {
    return VendorOwnerModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      isBanned: json['isBanned'] as bool,
    );
  }

  @override
  List<Object?> get props => [id, name, email, isBanned];
}

class VendorModel extends Equatable {
  final String id;
  final String storeName;
  final String status;
  final double? commissionRate;
  final String stripeOnboardingStatus;
  final DateTime createdAt;
  final VendorOwnerModel owner;

  const VendorModel({
    required this.id,
    required this.storeName,
    required this.status,
    this.commissionRate,
    required this.stripeOnboardingStatus,
    required this.createdAt,
    required this.owner,
  });

  factory VendorModel.fromJson(Map<String, dynamic> json) {
    return VendorModel(
      id: json['id'] as String,
      storeName: json['storeName'] as String,
      status: json['status'] as String,
      commissionRate: _readNullableDouble(json['commissionRate']),
      stripeOnboardingStatus: json['stripeOnboardingStatus'] as String,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      owner: VendorOwnerModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  /// Human-readable joined date, e.g. "Apr 7, 2026".
  String get formattedJoinDate {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[createdAt.month - 1]} ${createdAt.day}, ${createdAt.year}';
  }

  VendorModel copyWith({String? status}) {
    return VendorModel(
      id: id,
      storeName: storeName,
      status: status ?? this.status,
      commissionRate: commissionRate,
      stripeOnboardingStatus: stripeOnboardingStatus,
      createdAt: createdAt,
      owner: owner,
    );
  }

  @override
  List<Object?> get props => [
        id,
        storeName,
        status,
        commissionRate,
        stripeOnboardingStatus,
        createdAt,
        owner,
      ];
}
