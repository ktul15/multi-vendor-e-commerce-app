import 'package:dio/dio.dart';
import '../../../shared/models/category_model.dart';
import '../../../shared/models/product_model.dart';

/// Thrown when the API response is structurally unexpected.
class HomeDataException implements Exception {
  final String message;
  const HomeDataException(this.message);

  @override
  String toString() => message;
}

class HomeRepository {
  final Dio _dio;

  HomeRepository({required Dio dio}) : _dio = dio;

  Future<List<CategoryModel>> getCategories() async {
    final response = await _dio.get<Map<String, dynamic>>('/categories');
    final body = response.data;
    if (body == null || body['data'] is! List) {
      throw const HomeDataException('Failed to load categories');
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
    final response = await _dio.get<Map<String, dynamic>>(
      '/products',
      queryParameters: queryParameters,
    );
    final body = response.data;
    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List) {
      throw const HomeDataException('Failed to load products');
    }
    return ((body['data'] as Map<String, dynamic>)['items'] as List<dynamic>)
        .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
