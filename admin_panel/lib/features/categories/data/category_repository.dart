import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/category_model.dart';

class CategoryRepository {
  final Dio _dio;

  CategoryRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<List<CategoryModel>> getAllCategories() async {
    try {
      final response = await _dio.get('/categories');
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! List) {
        throw const ApiException('Failed to load categories');
      }
      return (body['data'] as List<dynamic>)
          .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(_errorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<CategoryModel> createCategory({
    required String name,
    String? image,
    String? parentId,
  }) async {
    try {
      final body = <String, dynamic>{'name': name};
      if (image != null && image.isNotEmpty) body['image'] = image;
      if (parentId != null) body['parentId'] = parentId;
      final response = await _dio.post('/categories', data: body);
      return CategoryModel.fromJson(
        (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException(_errorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<CategoryModel> updateCategory(
    String id, {
    required String name,
    String? image,
    String? parentId,
    bool clearParent = false,
  }) async {
    try {
      final body = <String, dynamic>{'name': name};
      if (image != null) body['image'] = image.isEmpty ? null : image;
      if (clearParent) {
        body['parentId'] = null;
      } else if (parentId != null) {
        body['parentId'] = parentId;
      }
      final response = await _dio.put('/categories/$id', data: body);
      return CategoryModel.fromJson(
        (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw ApiException(_errorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  Future<void> deleteCategory(String id) async {
    try {
      await _dio.delete('/categories/$id');
    } on DioException catch (e) {
      throw ApiException(_errorMessage(e), statusCode: e.response?.statusCode);
    }
  }

  String _errorMessage(DioException e) {
    if (e.response != null) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        return data['message'] as String;
      }
      return 'Request failed (${e.response?.statusCode})';
    }
    return e.message ?? 'Network error';
  }
}
