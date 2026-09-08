import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../shared/models/cart_model.dart';
import '../../shared/models/product_model.dart';

class GuestCartStorage {
  static const _key = 'guest_cart_items';

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<List<GuestCartItem>> loadItems() async {
    final prefs = await _getPrefs();
    final encoded = prefs.getString(_key);
    if (encoded == null || encoded.isEmpty) return [];

    try {
      return (jsonDecode(encoded) as List<dynamic>)
          .map((item) => GuestCartItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } on FormatException {
      await prefs.remove(_key);
      return [];
    }
  }

  Future<CartModel> loadCart() async => _toCart(await loadItems());

  Future<CartModel> add(
    ProductModel product,
    VariantModel variant,
    int quantity,
  ) async {
    final items = await loadItems();
    final index = items.indexWhere((item) => item.variantId == variant.id);
    if (index == -1) {
      items.add(GuestCartItem.fromProduct(product, variant, quantity));
    } else {
      final current = items[index];
      items[index] = current.copyWith(
        quantity: (current.quantity + quantity).clamp(1, variant.stock),
      );
    }
    await _save(items);
    return _toCart(items);
  }

  Future<CartModel> update(String variantId, int quantity) async {
    final items = await loadItems();
    final index = items.indexWhere((item) => item.variantId == variantId);
    if (index != -1) {
      items[index] = items[index].copyWith(
        quantity: quantity.clamp(1, items[index].variantStock),
      );
      await _save(items);
    }
    return _toCart(items);
  }

  Future<CartModel> remove(String variantId) async {
    final items = await loadItems()
      ..removeWhere((item) => item.variantId == variantId);
    await _save(items);
    return _toCart(items);
  }

  Future<void> clear() async {
    final prefs = await _getPrefs();
    await prefs.remove(_key);
  }

  Future<void> _save(List<GuestCartItem> items) async {
    final prefs = await _getPrefs();
    await prefs.setString(
      _key,
      jsonEncode(items.map((item) => item.toJson()).toList()),
    );
  }

  CartModel _toCart(List<GuestCartItem> items) {
    final cartItems = items.map((item) => item.toCartItem()).toList();
    return CartModel(
      id: 'guest-cart',
      userId: 'guest',
      items: cartItems,
      subtotal: cartItems.fold(0, (sum, item) => sum + item.lineTotal),
    );
  }
}

class GuestCartItem {
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

  const GuestCartItem({
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

  factory GuestCartItem.fromProduct(
    ProductModel product,
    VariantModel variant,
    int quantity,
  ) {
    return GuestCartItem(
      quantity: quantity,
      variantId: variant.id,
      variantSize: variant.size,
      variantColor: variant.color,
      variantPrice: variant.price,
      variantStock: variant.stock,
      variantSku: variant.sku,
      productId: product.id,
      productName: product.name,
      productImages: product.images,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
    );
  }

  factory GuestCartItem.fromJson(Map<String, dynamic> json) {
    return GuestCartItem(
      quantity: json['quantity'] as int,
      variantId: json['variantId'] as String,
      variantSize: json['variantSize'] as String?,
      variantColor: json['variantColor'] as String?,
      variantPrice: (json['variantPrice'] as num).toDouble(),
      variantStock: json['variantStock'] as int,
      variantSku: json['variantSku'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      productImages: List<String>.from(json['productImages'] as List? ?? []),
      vendorId: json['vendorId'] as String?,
      vendorName: json['vendorName'] as String?,
    );
  }

  GuestCartItem copyWith({int? quantity}) => GuestCartItem(
    quantity: quantity ?? this.quantity,
    variantId: variantId,
    variantSize: variantSize,
    variantColor: variantColor,
    variantPrice: variantPrice,
    variantStock: variantStock,
    variantSku: variantSku,
    productId: productId,
    productName: productName,
    productImages: productImages,
    vendorId: vendorId,
    vendorName: vendorName,
  );

  Map<String, dynamic> toJson() => {
    'quantity': quantity,
    'variantId': variantId,
    'variantSize': variantSize,
    'variantColor': variantColor,
    'variantPrice': variantPrice,
    'variantStock': variantStock,
    'variantSku': variantSku,
    'productId': productId,
    'productName': productName,
    'productImages': productImages,
    'vendorId': vendorId,
    'vendorName': vendorName,
  };

  CartItemModel toCartItem() => CartItemModel(
    id: variantId,
    cartId: 'guest-cart',
    quantity: quantity,
    variantId: variantId,
    variantSize: variantSize,
    variantColor: variantColor,
    variantPrice: variantPrice,
    variantStock: variantStock,
    variantSku: variantSku,
    productId: productId,
    productName: productName,
    productImages: productImages,
    vendorId: vendorId,
    vendorName: vendorName,
  );
}
