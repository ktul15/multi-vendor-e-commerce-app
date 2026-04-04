import 'package:dio/dio.dart';
import '../shared/models/product.dart';

class ProductsResult {
  final List<Product> products;
  final int total;
  final int totalPages;

  const ProductsResult({
    required this.products,
    required this.total,
    required this.totalPages,
  });
}

class ProductRepository {
  final Dio _dio;

  ProductRepository({required Dio dio}) : _dio = dio;

  Future<ProductsResult> getVendorProducts(
    String vendorId, {
    int page = 1,
    int limit = 100,
  }) async {
    final response = await _dio.get(
      '/products',
      queryParameters: {'vendorId': vendorId, 'page': page, 'limit': limit},
    );
    // Backend returns { data: { items: [...], meta: { total, page, limit, totalPages } } }
    final data = response.data['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>? ?? {};
    final rawList = data['items'] as List<dynamic>? ?? [];

    return ProductsResult(
      products: rawList
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (meta['total'] as num?)?.toInt() ?? rawList.length,
      totalPages: (meta['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  Future<Product> createProduct({
    required String name,
    required String description,
    required double basePrice,
    required String categoryId,
    bool isActive = true,
  }) async {
    final response = await _dio.post(
      '/products',
      data: {
        'name': name,
        'description': description,
        'basePrice': basePrice,
        'categoryId': categoryId,
        'isActive': isActive,
      },
    );
    return Product.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<Product> updateProduct(
    String productId, {
    String? name,
    String? description,
    double? basePrice,
    bool? isActive,
  }) async {
    final body = <String, dynamic>{};
    if (name != null) body['name'] = name;
    if (description != null) body['description'] = description;
    if (basePrice != null) body['basePrice'] = basePrice;
    if (isActive != null) body['isActive'] = isActive;

    final response = await _dio.put('/products/$productId', data: body);
    return Product.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<void> deleteProduct(String productId) async {
    await _dio.delete('/products/$productId');
  }
}
