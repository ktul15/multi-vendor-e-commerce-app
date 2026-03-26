import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/order_model.dart';
import '../shared/models/orders_page.dart';

class OrderRepository {
  final HttpClient _client;

  OrderRepository({required HttpClient client}) : _client = client;

  Future<OrderModel> createOrder({
    required String addressId,
    String? promoCode,
    String? notes,
  }) async {
    final data = <String, dynamic>{'addressId': addressId};
    if (promoCode != null) data['promoCode'] = promoCode;
    if (notes != null) data['notes'] = notes;

    final body = await _client.post('/orders', data: data);
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to place order');
    }
    return OrderModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<OrdersPage> getOrders({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    final queryParams = <String, String>{
      'page': '$page',
      'limit': '$limit',
    };
    if (status != null) queryParams['status'] = status;

    final body = await _client.get('/orders', queryParameters: queryParams);

    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const ApiException('Failed to load orders');
    }

    final data = body['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>;

    return OrdersPage(
      items: (data['items'] as List<dynamic>)
          .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }

  Future<String> createPaymentIntent({
    required String orderId,
    String currency = 'USD',
  }) async {
    final body = await _client.post('/payments/create-intent', data: {
      'orderId': orderId,
      'currency': currency,
    });
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to create payment intent');
    }
    final clientSecret = (body['data'] as Map)['clientSecret'];
    if (clientSecret is! String) {
      throw const ApiException('Invalid payment intent response');
    }
    return clientSecret;
  }
}
