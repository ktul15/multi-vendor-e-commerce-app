import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/product_filters.dart';
import '../shared/models/product_model.dart';

class SearchRepository {
  final HttpClient _client;

  SearchRepository({required HttpClient client}) : _client = client;

  Future<ProductsPage> searchProducts({
    required String query,
    int page = 1,
    int limit = 20,
    ProductSort sort = ProductSort.newest,
  }) async {
    final body = await _client.get(
      '/products/search',
      queryParameters: {
        'q': query,
        'page': page,
        'limit': limit,
        'sort': sort.value,
      },
    );

    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const ApiException('Failed to load search results');
    }

    final data = body['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>;

    return ProductsPage(
      items: (data['items'] as List<dynamic>)
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }
}
