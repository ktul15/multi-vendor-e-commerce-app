import 'package:dio/dio.dart';
import '../shared/models/vendor_order.dart';

class OrdersResult {
  final List<VendorOrder> orders;
  final int total;
  final int totalPages;

  const OrdersResult({
    required this.orders,
    required this.total,
    required this.totalPages,
  });
}

class OrderRepository {
  final Dio _dio;

  OrderRepository({required Dio dio}) : _dio = dio;

  Future<OrdersResult> getVendorOrders({
    int page = 1,
    int limit = 20,
    String? status,
  }) async {
    final params = <String, dynamic>{'page': page, 'limit': limit};
    if (status != null) params['status'] = status;

    final response = await _dio.get('/orders/vendor', queryParameters: params);
    // Backend returns { data: { items: [...], meta: { total, page, limit, totalPages } } }
    final data = response.data['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>? ?? {};
    final rawList = data['items'] as List<dynamic>? ?? [];

    return OrdersResult(
      orders: rawList
          .map((e) => VendorOrder.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (meta['total'] as num?)?.toInt() ?? rawList.length,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  Future<VendorOrder> updateOrderStatus(
    String vendorOrderId,
    String status, {
    String? trackingNumber,
    String? trackingCarrier,
  }) async {
    final body = <String, dynamic>{'status': status};
    if (trackingNumber != null && trackingNumber.isNotEmpty) {
      body['trackingNumber'] = trackingNumber;
    }
    if (trackingCarrier != null && trackingCarrier.isNotEmpty) {
      body['trackingCarrier'] = trackingCarrier;
    }

    final response = await _dio.put(
      '/orders/vendor/$vendorOrderId/status',
      data: body,
    );
    return VendorOrder.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}
