import 'package:equatable/equatable.dart';

class AdminVendorProfileModel extends Equatable {
  final String id;
  final String storeName;
  final String status;

  const AdminVendorProfileModel({
    required this.id,
    required this.storeName,
    required this.status,
  });

  factory AdminVendorProfileModel.fromJson(Map<String, dynamic> json) {
    return AdminVendorProfileModel(
      id: json['id'] as String,
      storeName: json['storeName'] as String,
      status: json['status'] as String,
    );
  }

  @override
  List<Object?> get props => [id, storeName, status];
}

class AdminUserModel extends Equatable {
  final String id;
  final String name;
  final String email;
  final String role;
  final bool isBanned;
  final bool isVerified;
  final DateTime createdAt;
  final AdminVendorProfileModel? vendorProfile;

  const AdminUserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.isBanned,
    required this.isVerified,
    required this.createdAt,
    this.vendorProfile,
  });

  factory AdminUserModel.fromJson(Map<String, dynamic> json) {
    final vp = json['vendorProfile'];
    return AdminUserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      isBanned: json['isBanned'] as bool,
      isVerified: json['isVerified'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      vendorProfile: vp is Map<String, dynamic>
          ? AdminVendorProfileModel.fromJson(vp)
          : null,
    );
  }

  AdminUserModel copyWith({bool? isBanned}) {
    return AdminUserModel(
      id: id,
      name: name,
      email: email,
      role: role,
      isBanned: isBanned ?? this.isBanned,
      isVerified: isVerified,
      createdAt: createdAt,
      vendorProfile: vendorProfile,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        email,
        role,
        isBanned,
        isVerified,
        createdAt,
        vendorProfile,
      ];
}
