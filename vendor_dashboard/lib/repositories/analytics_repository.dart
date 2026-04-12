import 'package:dio/dio.dart';
import '../shared/models/analytics_summary.dart';
import '../shared/models/sales_point.dart';
import '../shared/models/top_product.dart';

class AnalyticsRepository {
  final Dio _dio;

  AnalyticsRepository({required Dio dio}) : _dio = dio;

  Future<AnalyticsSummary> getSummary() async {
    final response = await _dio.get('/analytics/vendor/summary');
    return AnalyticsSummary.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  Future<SalesData> getSales({String period = 'day'}) async {
    final response = await _dio.get(
      '/analytics/vendor/sales',
      queryParameters: {'period': period},
    );
    return SalesData.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<TopProduct>> getTopProducts({int limit = 5}) async {
    final response = await _dio.get(
      '/analytics/vendor/top-products',
      queryParameters: {'limit': limit},
    );
    final data = response.data['data'] as Map<String, dynamic>;
    final rawList = data['products'] as List<dynamic>? ?? [];
    return rawList
        .map((e) => TopProduct.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
