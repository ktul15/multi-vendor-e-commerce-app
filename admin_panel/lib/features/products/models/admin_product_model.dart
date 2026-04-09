import 'package:equatable/equatable.dart';

class AdminProductVendorModel extends Equatable {
  final String id;
  final String name;
  final String email;

  const AdminProductVendorModel({
    required this.id,
    required this.name,
    required this.email,
  });

  factory AdminProductVendorModel.fromJson(Map<String, dynamic> json) {
    return AdminProductVendorModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
    );
  }

  @override
  List<Object?> get props => [id, name, email];
}

class AdminProductCategoryModel extends Equatable {
  final String id;
  final String name;

  const AdminProductCategoryModel({required this.id, required this.name});

  factory AdminProductCategoryModel.fromJson(Map<String, dynamic> json) {
    return AdminProductCategoryModel(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }

  @override
  List<Object?> get props => [id, name];
}

class AdminProductModel extends Equatable {
  final String id;
  final String name;
  final double basePrice;
  final bool isActive;
  final double avgRating;
  final int reviewCount;
  final int variantCount;
  final DateTime createdAt;
  final AdminProductVendorModel vendor;
  final AdminProductCategoryModel category;

  const AdminProductModel({
    required this.id,
    required this.name,
    required this.basePrice,
    required this.isActive,
    required this.avgRating,
    required this.reviewCount,
    required this.variantCount,
    required this.createdAt,
    required this.vendor,
    required this.category,
  });

  factory AdminProductModel.fromJson(Map<String, dynamic> json) {
    final count = json['_count'] as Map<String, dynamic>?;
    return AdminProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      basePrice: (json['basePrice'] as num).toDouble(),
      isActive: json['isActive'] as bool,
      avgRating: (json['avgRating'] as num).toDouble(),
      reviewCount: json['reviewCount'] as int,
      variantCount: count != null ? (count['variants'] as int? ?? 0) : 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      vendor: AdminProductVendorModel.fromJson(
          json['vendor'] as Map<String, dynamic>),
      category: AdminProductCategoryModel.fromJson(
          json['category'] as Map<String, dynamic>),
    );
  }

  /// e.g. "$12.99"
  String get formattedPrice =>
      '\$${basePrice.toStringAsFixed(2)}';

  /// e.g. "Apr 7, 2026"
  String get formattedDate {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[createdAt.month - 1]} ${createdAt.day}, ${createdAt.year}';
  }

  AdminProductModel copyWith({bool? isActive}) {
    return AdminProductModel(
      id: id,
      name: name,
      basePrice: basePrice,
      isActive: isActive ?? this.isActive,
      avgRating: avgRating,
      reviewCount: reviewCount,
      variantCount: variantCount,
      createdAt: createdAt,
      vendor: vendor,
      category: category,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        basePrice,
        isActive,
        avgRating,
        reviewCount,
        variantCount,
        createdAt,
        vendor,
        category,
      ];
}
