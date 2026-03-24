import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/order_model.dart';

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
