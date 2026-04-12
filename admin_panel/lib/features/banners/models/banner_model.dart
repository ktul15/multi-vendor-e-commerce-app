import 'package:equatable/equatable.dart';

class BannerModel extends Equatable {
  final String id;
  final String title;
  final String imageUrl;
  final String? imagePublicId;
  final String? linkUrl;
  final int position;
  final bool isActive;
  final DateTime createdAt;

  const BannerModel({
    required this.id,
    required this.title,
    required this.imageUrl,
    this.imagePublicId,
    this.linkUrl,
    required this.position,
    required this.isActive,
    required this.createdAt,
  });

  factory BannerModel.fromJson(Map<String, dynamic> json) {
    return BannerModel(
      id: json['id'] as String,
      title: json['title'] as String,
      imageUrl: json['imageUrl'] as String,
      imagePublicId: json['imagePublicId'] as String?,
      linkUrl: json['linkUrl'] as String?,
      position: (json['position'] as num).toInt(),
      isActive: json['isActive'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  BannerModel copyWith({
    String? id,
    String? title,
    String? imageUrl,
    String? imagePublicId,
    String? linkUrl,
    int? position,
    bool? isActive,
    DateTime? createdAt,
  }) {
    return BannerModel(
      id: id ?? this.id,
      title: title ?? this.title,
      imageUrl: imageUrl ?? this.imageUrl,
      imagePublicId: imagePublicId ?? this.imagePublicId,
      linkUrl: linkUrl ?? this.linkUrl,
      position: position ?? this.position,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props =>
      [id, title, imageUrl, imagePublicId, linkUrl, position, isActive, createdAt];
}
