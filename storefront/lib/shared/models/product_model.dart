import 'package:equatable/equatable.dart';

class VariantModel extends Equatable {
  final String id;
  final String? size;
  final String? color;
  final double price;
  final int stock;
  final String sku;

  const VariantModel({
    required this.id,
    this.size,
    this.color,
    required this.price,
    required this.stock,
    required this.sku,
  });

  factory VariantModel.fromJson(Map<String, dynamic> json) {
    return VariantModel(
      id: json['id'] as String,
      size: json['size'] as String?,
      color: json['color'] as String?,
      price: (json['price'] as num).toDouble(),
      stock: json['stock'] as int,
      sku: json['sku'] as String,
    );
  }

  @override
  List<Object?> get props => [id, size, color, price, stock, sku];
}

class ProductModel extends Equatable {
  final String id;
  final String name;
  final String description;
  final double basePrice;
  final List<String> images;
  final List<String> tags;
  final bool isActive;
  final double avgRating;
  final int reviewCount;
  final String? categoryId;
  final String? vendorId;
  final List<VariantModel> variants;
  final DateTime createdAt;

  const ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.basePrice,
    required this.images,
    required this.tags,
    required this.isActive,
    required this.avgRating,
    required this.reviewCount,
    this.categoryId,
    this.vendorId,
    required this.variants,
    required this.createdAt,
  });

  String? get thumbnailUrl => images.isNotEmpty ? images.first : null;

  /// Lowest price across all variants, or basePrice if no variants.
  double get displayPrice {
    if (variants.isEmpty) return basePrice;
    return variants.map((v) => v.price).reduce((a, b) => a < b ? a : b);
  }

  bool get isInStock => variants.isEmpty || variants.any((v) => v.stock > 0);

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      basePrice: (json['basePrice'] as num).toDouble(),
      images: List<String>.from(json['images'] as List? ?? []),
      tags: List<String>.from(json['tags'] as List? ?? []),
      isActive: json['isActive'] as bool? ?? true,
      avgRating: (json['avgRating'] as num? ?? 0).toDouble(),
      reviewCount: json['reviewCount'] as int? ?? 0,
      categoryId: json['categoryId'] as String?,
      vendorId: json['vendorId'] as String?,
      variants: (json['variants'] as List<dynamic>? ?? [])
          .map((v) => VariantModel.fromJson(v as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        basePrice,
        images,
        tags,
        isActive,
        avgRating,
        reviewCount,
        categoryId,
        vendorId,
        variants,
        createdAt,
      ];
}
