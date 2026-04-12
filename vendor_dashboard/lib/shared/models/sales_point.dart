class SalesPoint {
  final String periodStart;
  final int orderCount;
  final double revenue;

  const SalesPoint({
    required this.periodStart,
    required this.orderCount,
    required this.revenue,
  });

  factory SalesPoint.fromJson(Map<String, dynamic> json) {
    return SalesPoint(
      periodStart: json['periodStart'] as String,
      orderCount: (json['orderCount'] as num).toInt(),
      revenue: double.parse(json['revenue'].toString()),
    );
  }
}

class SalesData {
  final String period;
  final List<SalesPoint> series;

  const SalesData({required this.period, required this.series});

  factory SalesData.fromJson(Map<String, dynamic> json) {
    final rawSeries = json['series'] as List<dynamic>? ?? [];
    return SalesData(
      period: json['period'] as String,
      series: rawSeries
          .map((e) => SalesPoint.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
