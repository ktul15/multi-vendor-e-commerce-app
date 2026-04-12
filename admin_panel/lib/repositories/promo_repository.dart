import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/promos/models/promo_model.dart';
import '../features/users/models/user_list_meta_model.dart';

class PromoRepository {
  final Dio _dio;

  PromoRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<({List<PromoModel> items, UserListMetaModel meta})> listPromos({
    int page = 1,
    int limit = 20,
    bool? isActive,
    String? search,
    String? discountType,
  }) async {
    try {
      final response = await _dio.get(
        '/promo-codes',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (isActive != null) 'isActive': isActive,
          if (search != null && search.isNotEmpty) 'search': search,
          if (discountType != null) 'discountType': discountType,
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load promo codes');
      }
      final data = body['data'] as Map<String, dynamic>;
      if (data['items'] is! List) {
        throw const ApiException('Failed to load promo codes');
      }
      final items = (data['items'] as List<dynamic>)
          .map((e) => PromoModel.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = UserListMetaModel.fromJson(
        data['meta'] as Map<String, dynamic>,
      );
      return (items: items, meta: meta);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<PromoModel> getPromoById(String id) async {
    try {
      final response = await _dio.get('/promo-codes/$id');
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load promo code');
      }
      return PromoModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<PromoModel> createPromo({
    required String code,
    required String discountType,
    required double discountValue,
    double? minOrderValue,
    double? maxDiscount,
    int? usageLimit,
    int? perUserLimit,
    bool isActive = true,
    DateTime? expiresAt,
  }) async {
    try {
      final body = <String, dynamic>{
        'code': code.toUpperCase(),
        'discountType': discountType,
        'discountValue': discountValue,
        if (minOrderValue != null) 'minOrderValue': minOrderValue,
        if (maxDiscount != null) 'maxDiscount': maxDiscount,
        if (usageLimit != null) 'usageLimit': usageLimit,
        if (perUserLimit != null) 'perUserLimit': perUserLimit,
        'isActive': isActive,
        if (expiresAt != null) 'expiresAt': expiresAt.toUtc().toIso8601String(),
      };
      final response = await _dio.post('/promo-codes', data: body);
      final respBody = response.data as Map<String, dynamic>?;
      if (respBody == null || respBody['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to create promo code');
      }
      return PromoModel.fromJson(respBody['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<PromoModel> updatePromo(
    String id, {
    String? code,
    String? discountType,
    double? discountValue,
    double? minOrderValue,
    double? maxDiscount,
    int? usageLimit,
    int? perUserLimit,
    bool? isActive,
    DateTime? expiresAt,
    bool clearMinOrderValue = false,
    bool clearMaxDiscount = false,
    bool clearUsageLimit = false,
    bool clearPerUserLimit = false,
    bool clearExpiresAt = false,
  }) async {
    try {
      final body = <String, dynamic>{
        if (code != null) 'code': code.toUpperCase(),
        if (discountType != null) 'discountType': discountType,
        if (discountValue != null) 'discountValue': discountValue,
        if (clearMinOrderValue) 'minOrderValue': null,
        if (!clearMinOrderValue && minOrderValue != null)
          'minOrderValue': minOrderValue,
        if (clearMaxDiscount) 'maxDiscount': null,
        if (!clearMaxDiscount && maxDiscount != null) 'maxDiscount': maxDiscount,
        if (clearUsageLimit) 'usageLimit': null,
        if (!clearUsageLimit && usageLimit != null) 'usageLimit': usageLimit,
        if (clearPerUserLimit) 'perUserLimit': null,
        if (!clearPerUserLimit && perUserLimit != null)
          'perUserLimit': perUserLimit,
        if (isActive != null) 'isActive': isActive,
        if (clearExpiresAt) 'expiresAt': null,
        if (!clearExpiresAt && expiresAt != null)
          'expiresAt': expiresAt.toUtc().toIso8601String(),
      };
      final response = await _dio.put('/promo-codes/$id', data: body);
      final respBody = response.data as Map<String, dynamic>?;
      if (respBody == null || respBody['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to update promo code');
      }
      return PromoModel.fromJson(respBody['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<void> deletePromo(String id) async {
    try {
      await _dio.delete('/promo-codes/$id');
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
