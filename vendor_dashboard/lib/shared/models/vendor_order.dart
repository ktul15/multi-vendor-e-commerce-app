class VendorOrderItem {
  final String variantId;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final String? sku;
  final String? size;
  final String? color;
  final String? productName;

  const VendorOrderItem({
    required this.variantId,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.sku,
    this.size,
    this.color,
    this.productName,
  });

  factory VendorOrderItem.fromJson(Map<String, dynamic> json) {
    final variant = json['variant'] as Map<String, dynamic>? ?? {};
    final product = variant['product'] as Map<String, dynamic>? ?? {};
    return VendorOrderItem(
      variantId: json['variantId'] as String,
      quantity: (json['quantity'] as num).toInt(),
      unitPrice: double.parse(json['unitPrice'].toString()),
      totalPrice: double.parse(json['totalPrice'].toString()),
      sku: variant['sku'] as String?,
      size: variant['size'] as String?,
      color: variant['color'] as String?,
      productName: product['name'] as String?,
    );
  }
}

class VendorOrder {
  final String id;
  final String status;
  final double subtotal;
  final String? trackingNumber;
  final String? trackingCarrier;
  final DateTime createdAt;
  final String orderNumber;
  final String? customerName;
  final String? customerEmail;
  final List<VendorOrderItem> items;

  const VendorOrder({
    required this.id,
    required this.status,
    required this.subtotal,
    this.trackingNumber,
    this.trackingCarrier,
    required this.createdAt,
    required this.orderNumber,
    this.customerName,
    this.customerEmail,
    required this.items,
  });

  factory VendorOrder.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>? ?? {};
    final user = order['user'] as Map<String, dynamic>? ?? {};
    final rawItems = json['items'] as List<dynamic>? ?? [];

    // vendorOrder.createdAt is always present (Prisma @default(now())).
    // Fall back to order.createdAt only if somehow missing (e.g., partial response).
    final rawDate =
        (json['createdAt'] ?? order['createdAt'])?.toString();
    final createdAt =
        rawDate != null ? DateTime.tryParse(rawDate) ?? DateTime.now() : DateTime.now();

    return VendorOrder(
      id: json['id'] as String,
      status: json['status'] as String,
      subtotal: double.parse(json['subtotal'].toString()),
      trackingNumber: json['trackingNumber'] as String?,
      trackingCarrier: json['trackingCarrier'] as String?,
      createdAt: createdAt,
      orderNumber: order['orderNumber'] as String? ?? '',
      customerName: user['name'] as String?,
      customerEmail: user['email'] as String?,
      items: rawItems
          .map((e) => VendorOrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
