import 'package:dio/dio.dart';
import '../shared/models/product_filters.dart';
import '../shared/models/product_model.dart';

class ProductListRepository {
  final Dio _dio;

  ProductListRepository({required Dio dio}) : _dio = dio;

  Future<ProductsPage> getProducts({
    required ProductFilters filters,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/products',
      queryParameters: filters.toQueryParams(page, limit),
    );

    final body = response.data;
    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const _ProductListException('Failed to load products');
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

class _ProductListException implements Exception {
  final String message;
  const _ProductListException(this.message);

  @override
  String toString() => message;
}
