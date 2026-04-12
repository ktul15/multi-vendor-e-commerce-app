import 'package:equatable/equatable.dart';

class AdminOrderDetailModel extends Equatable {
  final String id;
  final String orderNumber;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String? notes;
  final DateTime createdAt;
  final AdminOrderCustomerModel customer;
  final List<AdminVendorOrderModel> vendorOrders;
  final AdminOrderAddressModel? address;
  final AdminOrderPaymentModel? payment;
  final AdminOrderPromoModel? promoCode;

  const AdminOrderDetailModel({
    required this.id,
    required this.orderNumber,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    this.notes,
    required this.createdAt,
    required this.customer,
    required this.vendorOrders,
    this.address,
    this.payment,
    this.promoCode,
  });

  factory AdminOrderDetailModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>? ?? {};
    return AdminOrderDetailModel(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0.0,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      customer: AdminOrderCustomerModel.fromJson(user),
      vendorOrders: (json['vendorOrders'] as List<dynamic>? ?? [])
          .map((e) => AdminVendorOrderModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      address: json['address'] != null
          ? AdminOrderAddressModel.fromJson(
              json['address'] as Map<String, dynamic>)
          : null,
      payment: json['payment'] != null
          ? AdminOrderPaymentModel.fromJson(
              json['payment'] as Map<String, dynamic>)
          : null,
      promoCode: json['promoCode'] != null
          ? AdminOrderPromoModel.fromJson(
              json['promoCode'] as Map<String, dynamic>)
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        subtotal,
        discount,
        tax,
        total,
        notes,
        createdAt,
        customer,
        vendorOrders,
        address,
        payment,
        promoCode,
      ];
}

class AdminOrderCustomerModel extends Equatable {
  final String id;
  final String name;
  final String email;

  const AdminOrderCustomerModel({
    required this.id,
    required this.name,
    required this.email,
  });

  factory AdminOrderCustomerModel.fromJson(Map<String, dynamic> json) {
    return AdminOrderCustomerModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown',
      email: json['email'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [id, name, email];
}

class AdminVendorOrderModel extends Equatable {
  final String id;
  final String status;
  final double subtotal;
  final String vendorId;
  final String storeName;
  final String? trackingNumber;
  final String? trackingCarrier;
  final List<AdminOrderItemModel> items;

  const AdminVendorOrderModel({
    required this.id,
    required this.status,
    required this.subtotal,
    required this.vendorId,
    required this.storeName,
    this.trackingNumber,
    this.trackingCarrier,
    required this.items,
  });

  factory AdminVendorOrderModel.fromJson(Map<String, dynamic> json) {
    final vendor = json['vendor'] as Map<String, dynamic>? ?? {};
    final vendorProfile =
        vendor['vendorProfile'] as Map<String, dynamic>? ?? {};

    return AdminVendorOrderModel(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'PENDING',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      vendorId: json['vendorId'] as String? ?? '',
      storeName: vendorProfile['storeName'] as String? ?? 'Unknown Store',
      trackingNumber: json['trackingNumber'] as String?,
      trackingCarrier: json['trackingCarrier'] as String?,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => AdminOrderItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props =>
      [id, status, subtotal, vendorId, storeName, trackingNumber, trackingCarrier, items];
}

class AdminOrderItemModel extends Equatable {
  final String id;
  final String productName;
  final String sku;
  final String? size;
  final String? color;
  final double price;
  final int quantity;
  final double subtotal;
  final String? imageUrl;

  const AdminOrderItemModel({
    required this.id,
    required this.productName,
    required this.sku,
    this.size,
    this.color,
    required this.price,
    required this.quantity,
    required this.subtotal,
    this.imageUrl,
  });

  factory AdminOrderItemModel.fromJson(Map<String, dynamic> json) {
    final variant = json['variant'] as Map<String, dynamic>? ?? {};
    final product = variant['product'] as Map<String, dynamic>? ?? {};
    final images = product['images'] as List<dynamic>? ?? [];

    return AdminOrderItemModel(
      id: json['id'] as String,
      productName: product['name'] as String? ?? 'Unknown Product',
      sku: variant['sku'] as String? ?? '',
      size: variant['size'] as String?,
      color: variant['color'] as String?,
      price: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] as int? ?? 1,
      subtotal: (json['totalPrice'] as num?)?.toDouble() ?? 0.0,
      imageUrl: images.isNotEmpty ? images.first as String? : null,
    );
  }

  @override
  List<Object?> get props =>
      [id, productName, sku, size, color, price, quantity, subtotal, imageUrl];
}

class AdminOrderAddressModel extends Equatable {
  final String street;
  final String city;
  final String state;
  final String postalCode;
  final String country;

  const AdminOrderAddressModel({
    required this.street,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.country,
  });

  factory AdminOrderAddressModel.fromJson(Map<String, dynamic> json) {
    return AdminOrderAddressModel(
      street: json['street'] as String? ?? '',
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      postalCode: json['postalCode'] as String? ?? '',
      country: json['country'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [street, city, state, postalCode, country];
}

class AdminOrderPaymentModel extends Equatable {
  final String status;
  final String method;
  final DateTime? paidAt;

  const AdminOrderPaymentModel({
    required this.status,
    required this.method,
    this.paidAt,
  });

  factory AdminOrderPaymentModel.fromJson(Map<String, dynamic> json) {
    return AdminOrderPaymentModel(
      status: json['status'] as String? ?? 'PENDING',
      method: json['method'] as String? ?? 'UNKNOWN',
      paidAt: json['paidAt'] != null
          ? DateTime.parse(json['paidAt'] as String)
          : null,
    );
  }

  @override
  List<Object?> get props => [status, method, paidAt];
}

class AdminOrderPromoModel extends Equatable {
  final String code;
  final String discountType;
  final double discountValue;

  const AdminOrderPromoModel({
    required this.code,
    required this.discountType,
    required this.discountValue,
  });

  factory AdminOrderPromoModel.fromJson(Map<String, dynamic> json) {
    return AdminOrderPromoModel(
      code: json['code'] as String? ?? '',
      discountType: json['discountType'] as String? ?? '',
      discountValue: (json['discountValue'] as num?)?.toDouble() ?? 0.0,
    );
  }

  @override
  List<Object?> get props => [code, discountType, discountValue];
}
