import 'package:equatable/equatable.dart';

class PromoModel extends Equatable {
  final String id;
  final String code;
  final String discountType; // 'PERCENTAGE' | 'FIXED'
  final double discountValue;
  final double? minOrderValue;
  final double? maxDiscount;
  final int? usageLimit;
  final int usageCount;
  final int? perUserLimit;
  final bool isActive;
  final DateTime? expiresAt;
  final DateTime createdAt;

  const PromoModel({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    this.minOrderValue,
    this.maxDiscount,
    this.usageLimit,
    required this.usageCount,
    this.perUserLimit,
    required this.isActive,
    this.expiresAt,
    required this.createdAt,
  });

  factory PromoModel.fromJson(Map<String, dynamic> json) {
    return PromoModel(
      id: json['id'] as String,
      code: json['code'] as String,
      discountType: json['discountType'] as String,
      discountValue: double.parse(json['discountValue'].toString()),
      minOrderValue: json['minOrderValue'] != null
          ? double.parse(json['minOrderValue'].toString())
          : null,
      maxDiscount: json['maxDiscount'] != null
          ? double.parse(json['maxDiscount'].toString())
          : null,
      usageLimit: json['usageLimit'] as int?,
      usageCount: (json['usageCount'] as num).toInt(),
      perUserLimit: json['perUserLimit'] as int?,
      isActive: json['isActive'] as bool,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// Human-readable discount: "10%" or "$5.00".
  String get formattedDiscount {
    final formatted = discountValue % 1 == 0
        ? discountValue.toStringAsFixed(0)
        : discountValue.toStringAsFixed(2);
    return discountType == 'PERCENTAGE' ? '$formatted%' : '\$$formatted';
  }

  PromoModel copyWith({
    String? id,
    String? code,
    String? discountType,
    double? discountValue,
    double? minOrderValue,
    double? maxDiscount,
    int? usageLimit,
    int? usageCount,
    int? perUserLimit,
    bool? isActive,
    DateTime? expiresAt,
    DateTime? createdAt,
    bool clearMinOrderValue = false,
    bool clearMaxDiscount = false,
    bool clearUsageLimit = false,
    bool clearPerUserLimit = false,
    bool clearExpiresAt = false,
  }) {
    return PromoModel(
      id: id ?? this.id,
      code: code ?? this.code,
      discountType: discountType ?? this.discountType,
      discountValue: discountValue ?? this.discountValue,
      minOrderValue: clearMinOrderValue ? null : (minOrderValue ?? this.minOrderValue),
      maxDiscount: clearMaxDiscount ? null : (maxDiscount ?? this.maxDiscount),
      usageLimit: clearUsageLimit ? null : (usageLimit ?? this.usageLimit),
      usageCount: usageCount ?? this.usageCount,
      perUserLimit: clearPerUserLimit ? null : (perUserLimit ?? this.perUserLimit),
      isActive: isActive ?? this.isActive,
      expiresAt: clearExpiresAt ? null : (expiresAt ?? this.expiresAt),
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        code,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscount,
        usageLimit,
        usageCount,
        perUserLimit,
        isActive,
        expiresAt,
        createdAt,
      ];
}
