import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/categories/models/category_model.dart';

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
    Uint8List? imageBytes,
    String? imageFilename,
    String? parentId,
  }) async {
    try {
      final response = imageBytes == null
          ? await _dio.post(
              '/categories',
              data: {
                'name': name,
                if (image != null && image.isNotEmpty) 'image': image,
                if (parentId != null) 'parentId': parentId,
              },
            )
          : await _dio.post(
              '/categories',
              data: FormData.fromMap({
                'name': name,
                if (parentId != null) 'parentId': parentId,
                'image': MultipartFile.fromBytes(
                  imageBytes,
                  filename: imageFilename ?? 'category-image',
                  contentType: _mediaTypeFor(imageFilename),
                ),
              }),
            );
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
    Uint8List? imageBytes,
    String? imageFilename,
    String? parentId,
    bool clearParent = false,
  }) async {
    try {
      final response = imageBytes == null
          ? await _dio.put(
              '/categories/$id',
              data: {
                'name': name,
                if (image != null) 'image': image.isEmpty ? null : image,
                if (clearParent) 'parentId': null,
                if (!clearParent && parentId != null) 'parentId': parentId,
              },
            )
          : await _dio.put(
              '/categories/$id',
              data: FormData.fromMap({
                'name': name,
                if (clearParent) 'parentId': '',
                if (!clearParent && parentId != null) 'parentId': parentId,
                'image': MultipartFile.fromBytes(
                  imageBytes,
                  filename: imageFilename ?? 'category-image',
                  contentType: _mediaTypeFor(imageFilename),
                ),
              }),
            );
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

  MediaType _mediaTypeFor(String? filename) {
    final extension = filename?.split('.').last.toLowerCase();
    return switch (extension) {
      'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
      'png' => MediaType('image', 'png'),
      'webp' => MediaType('image', 'webp'),
      _ => MediaType('image', 'jpeg'),
    };
  }
}
