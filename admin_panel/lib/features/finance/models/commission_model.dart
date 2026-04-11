import 'package:equatable/equatable.dart';

class CommissionModel extends Equatable {
  /// Commission rate stored as 0–100 (e.g. 10.0 = 10%).
  final double rate;

  /// 'database' when the rate was set via the admin API;
  /// 'env_fallback' when the platform is using the default from env.
  final String source;

  const CommissionModel({required this.rate, required this.source});

  factory CommissionModel.fromJson(Map<String, dynamic> json) {
    return CommissionModel(
      rate: (json['rate'] as num?)?.toDouble() ?? 0.0,
      source: json['source'] as String? ?? 'env_fallback',
    );
  }

  @override
  List<Object?> get props => [rate, source];
}
