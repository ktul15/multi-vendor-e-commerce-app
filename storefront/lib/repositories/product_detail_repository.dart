import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/product_model.dart';

class ProductDetailRepository {
  final HttpClient _client;

  ProductDetailRepository({required HttpClient client}) : _client = client;

  Future<ProductModel> getProductById(String id) async {
    final body = await _client.get('/products/$id');

    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to load product');
    }

    return ProductModel.fromJson(body['data'] as Map<String, dynamic>);
  }
}
