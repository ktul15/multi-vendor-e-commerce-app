import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/category_model.dart';
import '../shared/models/product_model.dart';

class HomeRepository {
  final HttpClient _client;

  HomeRepository({required HttpClient client}) : _client = client;

  Future<List<CategoryModel>> getCategories() async {
    final body = await _client.get('/categories');
    if (body == null || body['data'] is! List) {
      throw const ApiException('Failed to load categories');
    }
    return (body['data'] as List<dynamic>)
        .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ProductModel>> getTrendingProducts({int limit = 10}) async {
    return _fetchProducts({'sort': 'popular', 'limit': limit});
  }

  Future<List<ProductModel>> getNewArrivals({int limit = 10}) async {
    return _fetchProducts({'sort': 'newest', 'limit': limit});
  }

  Future<List<ProductModel>> _fetchProducts(
    Map<String, dynamic> queryParameters,
  ) async {
    final body = await _client.get('/products', queryParameters: queryParameters);
    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List) {
      throw const ApiException('Failed to load products');
    }
    return ((body['data'] as Map<String, dynamic>)['items'] as List<dynamic>)
        .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
