import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/banners/models/banner_model.dart';
import '../features/users/models/user_list_meta_model.dart';

class BannerRepository {
  final Dio _dio;

  BannerRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<({List<BannerModel> items, UserListMetaModel meta})> listBanners({
    int page = 1,
    int limit = 20,
    bool? isActive,
  }) async {
    try {
      final response = await _dio.get(
        '/banners/all',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (isActive != null) 'isActive': isActive,
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load banners');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List) {
        throw const ApiException('Failed to load banners');
      }
      final items = (data['items'] as List<dynamic>)
          .map((e) => BannerModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = UserListMetaModel.fromJson(
        data['meta'] as Map<String, dynamic>,
      );
      return (items: items, meta: meta);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<BannerModel> getBannerById(String id) async {
    try {
      final response = await _dio.get('/banners/$id');
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load banner');
      }
      return BannerModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  /// Creates a banner. [imagePath] is the local file path selected via file_picker.
  Future<BannerModel> createBanner({
    required String title,
    required String imagePath,
    String? linkUrl,
    int position = 0,
    bool isActive = true,
  }) async {
    try {
      final formData = FormData.fromMap({
        'title': title,
        if (linkUrl != null && linkUrl.isNotEmpty) 'linkUrl': linkUrl,
        'position': position,
        'isActive': isActive,
        'image': await MultipartFile.fromFile(
          imagePath,
          filename: imagePath.split('/').last,
        ),
      });
      final response = await _dio.post('/banners', data: formData);
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to create banner');
      }
      return BannerModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  /// Updates a banner. [imagePath] is optional — omit to keep the current image.
  Future<BannerModel> updateBanner(
    String id, {
    String? title,
    String? imagePath,
    String? linkUrl,
    bool clearLinkUrl = false,
    int? position,
    bool? isActive,
  }) async {
    try {
      final FormData formData;
      if (imagePath != null) {
        formData = FormData.fromMap({
          if (title != null) 'title': title,
          if (clearLinkUrl) 'linkUrl': '',
          if (!clearLinkUrl && linkUrl != null) 'linkUrl': linkUrl,
          if (position != null) 'position': position,
          if (isActive != null) 'isActive': isActive,
          'image': await MultipartFile.fromFile(
            imagePath,
            filename: imagePath.split('/').last,
          ),
        });
      } else {
        // No image change — send JSON
        final body = <String, dynamic>{
          if (title != null) 'title': title,
          if (clearLinkUrl) 'linkUrl': null,
          if (!clearLinkUrl && linkUrl != null) 'linkUrl': linkUrl,
          if (position != null) 'position': position,
          if (isActive != null) 'isActive': isActive,
        };
        final response = await _dio.put('/banners/$id', data: body);
        final respBody = response.data as Map<String, dynamic>?;
        if (respBody == null || respBody['data'] is! Map<String, dynamic>) {
          throw const ApiException('Failed to update banner');
        }
        return BannerModel.fromJson(respBody['data'] as Map<String, dynamic>);
      }
      final response = await _dio.put('/banners/$id', data: formData);
      final respBody = response.data as Map<String, dynamic>?;
      if (respBody == null || respBody['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to update banner');
      }
      return BannerModel.fromJson(respBody['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> deleteBanner(String id) async {
    try {
      await _dio.delete('/banners/$id');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
