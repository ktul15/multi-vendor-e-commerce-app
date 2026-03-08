import 'package:dio/dio.dart';
import '../shared/models/product_model.dart';

class ProductDetailRepository {
  final Dio _dio;

  ProductDetailRepository({required Dio dio}) : _dio = dio;

  Future<ProductModel> getProductById(String id) async {
    final response = await _dio.get<Map<String, dynamic>>('/products/$id');

    final body = response.data;
    if (body == null || body['data'] is! Map) {
      throw const _ProductDetailException('Failed to load product');
    }

    return ProductModel.fromJson(body['data'] as Map<String, dynamic>);
  }
}

class _ProductDetailException implements Exception {
  final String message;
  const _ProductDetailException(this.message);

  @override
  String toString() => message;
}
