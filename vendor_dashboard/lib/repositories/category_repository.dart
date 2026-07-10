import 'package:dio/dio.dart';
import '../shared/models/product_category.dart';

class CategoryRepository {
  final Dio _dio;

  CategoryRepository({required Dio dio}) : _dio = dio;

  Future<List<ProductCategory>> getCategories() async {
    final response = await _dio.get('/categories');
    final rawList = response.data['data'] as List<dynamic>? ?? [];
    return rawList
        .map((e) => ProductCategory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<CategoryOption>> getCategoryOptions() async {
    final categories = await getCategories();
    return flattenCategoryOptions(categories);
  }
}
