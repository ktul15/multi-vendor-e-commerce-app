import 'package:equatable/equatable.dart';

class WishlistProduct extends Equatable {
  final String id;
  final String name;
  final double basePrice;
  final List<String> images;
  final bool isActive;
  final double avgRating;
  final int reviewCount;
  final String? vendorName;

  const WishlistProduct({
    required this.id,
    required this.name,
    required this.basePrice,
    required this.images,
    required this.isActive,
    required this.avgRating,
    required this.reviewCount,
    this.vendorName,
  });

  String? get thumbnailUrl => images.isNotEmpty ? images.first : null;

  factory WishlistProduct.fromJson(Map<String, dynamic> json) {
    final vendor = json['vendor'] as Map<String, dynamic>?;
    return WishlistProduct(
      id: json['id'] as String,
      name: json['name'] as String,
      basePrice: (json['basePrice'] as num).toDouble(),
      images: List<String>.from(json['images'] as List? ?? []),
      isActive: json['isActive'] as bool? ?? true,
      avgRating: (json['avgRating'] as num? ?? 0).toDouble(),
      reviewCount: json['reviewCount'] as int? ?? 0,
      vendorName: vendor?['name'] as String?,
    );
  }

  @override
  List<Object?> get props =>
      [id, name, basePrice, images, isActive, avgRating, reviewCount, vendorName];
}

class WishlistItemModel extends Equatable {
  final String id;
  final String userId;
  final String productId;
  final DateTime createdAt;
  final WishlistProduct product;

  const WishlistItemModel({
    required this.id,
    required this.userId,
    required this.productId,
    required this.createdAt,
    required this.product,
  });

  factory WishlistItemModel.fromJson(Map<String, dynamic> json) {
    return WishlistItemModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      productId: json['productId'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      product:
          WishlistProduct.fromJson(json['product'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [id, userId, productId, createdAt, product];
}

class WishlistPageData {
  final List<WishlistItemModel> items;
  final int total;
  final int page;
  final int totalPages;

  const WishlistPageData({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });
}
