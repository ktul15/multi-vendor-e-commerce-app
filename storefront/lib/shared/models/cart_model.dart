import 'package:equatable/equatable.dart';

class CartItemModel extends Equatable {
  final String id;
  final String cartId;
  final int quantity;
  final String variantId;
  final String? variantSize;
  final String? variantColor;
  final double variantPrice;
  final int variantStock;
  final String variantSku;
  final String productId;
  final String productName;
  final List<String> productImages;
  final String? vendorId;
  final String? vendorName;

  const CartItemModel({
    required this.id,
    required this.cartId,
    required this.quantity,
    required this.variantId,
    this.variantSize,
    this.variantColor,
    required this.variantPrice,
    required this.variantStock,
    required this.variantSku,
    required this.productId,
    required this.productName,
    required this.productImages,
    this.vendorId,
    this.vendorName,
  });

  String? get thumbnailUrl =>
      productImages.isNotEmpty ? productImages.first : null;

  double get lineTotal => variantPrice * quantity;

  String get variantLabel {
    final parts = [variantSize, variantColor].whereType<String>().toList();
    return parts.isNotEmpty ? parts.join(' / ') : 'Default';
  }

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final variant = json['variant'] as Map<String, dynamic>;
    final product = variant['product'] as Map<String, dynamic>;
    final vendor = product['vendor'] as Map<String, dynamic>?;
    return CartItemModel(
      id: json['id'] as String,
      cartId: json['cartId'] as String,
      quantity: json['quantity'] as int,
      variantId: variant['id'] as String,
      variantSize: variant['size'] as String?,
      variantColor: variant['color'] as String?,
      variantPrice: (variant['price'] as num).toDouble(),
      variantStock: variant['stock'] as int,
      variantSku: variant['sku'] as String,
      productId: product['id'] as String,
      productName: product['name'] as String,
      productImages: List<String>.from(product['images'] as List? ?? []),
      vendorId: product['vendorId'] as String?,
      vendorName: vendor?['name'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        id,
        cartId,
        quantity,
        variantId,
        variantSize,
        variantColor,
        variantPrice,
        variantStock,
        variantSku,
        productId,
        productName,
        productImages,
        vendorId,
        vendorName,
      ];
}

class CartVendorGroup extends Equatable {
  final String? vendorId;
  final String? vendorName;
  final List<CartItemModel> items;

  const CartVendorGroup({
    required this.vendorId,
    required this.vendorName,
    required this.items,
  });

  double get groupSubtotal =>
      items.fold(0, (sum, item) => sum + item.lineTotal);

  @override
  List<Object?> get props => [vendorId, vendorName, items];
}

class CartModel extends Equatable {
  final String id;
  final String userId;
  final List<CartItemModel> items;
  final double subtotal;

  const CartModel({
    required this.id,
    required this.userId,
    required this.items,
    required this.subtotal,
  });

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  bool get isEmpty => items.isEmpty;

  List<CartVendorGroup> get vendorGroups {
    final map = <String?, List<CartItemModel>>{};
    for (final item in items) {
      map.putIfAbsent(item.vendorId, () => []).add(item);
    }
    return map.entries
        .map((e) => CartVendorGroup(
              vendorId: e.key,
              vendorName: e.value.first.vendorName,
              items: e.value,
            ))
        .toList();
  }

  factory CartModel.fromJson(Map<String, dynamic> json) {
    return CartModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((i) => CartItemModel.fromJson(i as Map<String, dynamic>))
          .toList(),
      subtotal: (json['subtotal'] as num? ?? 0).toDouble(),
    );
  }

  @override
  List<Object?> get props => [id, userId, items, subtotal];
}

class PromoPreviewModel extends Equatable {
  final String code;
  final String discountType;
  final double discountValue;
  final double? maxDiscount;
  final double discountAmount;
  final double subtotal;
  final double total;

  const PromoPreviewModel({
    required this.code,
    required this.discountType,
    required this.discountValue,
    this.maxDiscount,
    required this.discountAmount,
    required this.subtotal,
    required this.total,
  });

  factory PromoPreviewModel.fromJson(Map<String, dynamic> json) {
    return PromoPreviewModel(
      code: json['code'] as String,
      discountType: json['discountType'] as String,
      discountValue: (json['discountValue'] as num).toDouble(),
      maxDiscount: (json['maxDiscount'] as num?)?.toDouble(),
      discountAmount: (json['discountAmount'] as num).toDouble(),
      subtotal: (json['subtotal'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [
        code,
        discountType,
        discountValue,
        maxDiscount,
        discountAmount,
        subtotal,
        total,
      ];
}
