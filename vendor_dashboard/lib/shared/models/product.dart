class ProductVariant {
  final String id;
  final String sku;
  final double price;
  final int stock;
  final String? size;
  final String? color;

  const ProductVariant({
    required this.id,
    required this.sku,
    required this.price,
    required this.stock,
    this.size,
    this.color,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['id'] as String,
      sku: json['sku'] as String,
      price: double.parse(json['price'].toString()),
      stock: (json['stock'] as num).toInt(),
      size: json['size'] as String?,
      color: json['color'] as String?,
    );
  }
}

class Product {
  final String id;
  final String name;
  final String description;
  final double basePrice;
  final bool isActive;
  final List<String> images;
  final List<String> tags;
  final List<ProductVariant> variants;
  final String? categoryId;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.basePrice,
    required this.isActive,
    required this.images,
    required this.tags,
    required this.variants,
    this.categoryId,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    final rawVariants = json['variants'] as List<dynamic>? ?? [];
    final rawImages = json['images'] as List<dynamic>? ?? [];
    final rawTags = json['tags'] as List<dynamic>? ?? [];
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      basePrice: double.parse(json['basePrice'].toString()),
      isActive: json['isActive'] as bool? ?? true,
      images: rawImages.map((e) => e as String).toList(),
      tags: rawTags.map((e) => e as String).toList(),
      variants: rawVariants
          .map((e) => ProductVariant.fromJson(e as Map<String, dynamic>))
          .toList(),
      categoryId: json['categoryId'] as String?,
    );
  }
}
