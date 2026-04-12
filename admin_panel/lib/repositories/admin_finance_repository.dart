import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../features/dashboard/models/revenue_model.dart';
import '../features/finance/models/commission_model.dart';

class AdminFinanceRepository {
  final Dio _dio;

  AdminFinanceRepository({Dio? dio}) : _dio = dio ?? ApiClient.instance;

  Future<RevenueModel> getRevenue({
    String period = 'month',
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final response = await _dio.get(
        '/admin/revenue',
        queryParameters: {
          'period': period,
          if (startDate != null)
            'startDate': startDate.toUtc().toIso8601String(),
          if (endDate != null) 'endDate': endDate.toUtc().toIso8601String(),
        },
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load revenue data');
      }
      return RevenueModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<CommissionModel> getCommission() async {
    try {
      final response = await _dio.get('/admin/commission');
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to load commission settings');
      }
      return CommissionModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }

  Future<CommissionModel> updateCommission(double rate) async {
    try {
      final response = await _dio.patch(
        '/admin/commission',
        data: {'rate': rate},
      );
      final body = response.data as Map<String, dynamic>?;
      if (body == null || body['data'] is! Map<String, dynamic>) {
        throw const ApiException('Failed to update commission rate');
      }
      // The PATCH endpoint returns { rate } without a source field;
      // default to 'database' since it was explicitly set.
      final data = body['data'] as Map<String, dynamic>;
      return CommissionModel.fromJson({...data, 'source': 'database'});
    } on DioException catch (e) {
      throw ApiException(e.errorMessage, statusCode: e.response?.statusCode);
    }
  }
}
