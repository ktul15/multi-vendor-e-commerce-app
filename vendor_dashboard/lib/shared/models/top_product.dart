class TopProduct {
  final int rank;
  final String productId;
  final String productName;
  final int orderCount;
  final double totalRevenue;

  const TopProduct({
    required this.rank,
    required this.productId,
    required this.productName,
    required this.orderCount,
    required this.totalRevenue,
  });

  factory TopProduct.fromJson(Map<String, dynamic> json) {
    return TopProduct(
      rank: (json['rank'] as num).toInt(),
      productId: json['productId'] as String,
      productName: json['productName'] as String,
      orderCount: (json['orderCount'] as num).toInt(),
      totalRevenue: double.parse(json['totalRevenue'].toString()),
    );
  }
}
