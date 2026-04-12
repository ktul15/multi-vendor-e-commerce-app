import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/cart_model.dart';

class CartRepository {
  final HttpClient _client;

  CartRepository({required HttpClient client}) : _client = client;

  Future<CartModel> getCart() async {
    final body = await _client.get('/cart');
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to load cart');
    }
    return CartModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<CartModel> addItem(String variantId, int quantity) async {
    final body = await _client.post('/cart/items', data: {
      'variantId': variantId,
      'quantity': quantity,
    });
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to add item');
    }
    return CartModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<CartModel> updateItem(String itemId, int quantity) async {
    final body =
        await _client.patch('/cart/items/$itemId', data: {'quantity': quantity});
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to update item');
    }
    return CartModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<CartModel> removeItem(String itemId) async {
    final body = await _client.delete('/cart/items/$itemId');
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to remove item');
    }
    return CartModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<void> clearCart() async {
    await _client.delete('/cart');
  }

  Future<PromoPreviewModel> previewPromo(String code) async {
    final body =
        await _client.post('/cart/preview-promo', data: {'code': code});
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to preview promo');
    }
    return PromoPreviewModel.fromJson(body['data'] as Map<String, dynamic>);
  }
}
