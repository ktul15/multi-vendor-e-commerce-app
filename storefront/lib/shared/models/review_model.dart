import 'package:equatable/equatable.dart';

class ReviewUser extends Equatable {
  final String id;
  final String name;
  final String? avatar;

  const ReviewUser({
    required this.id,
    required this.name,
    this.avatar,
  });

  factory ReviewUser.fromJson(Map<String, dynamic> json) {
    return ReviewUser(
      id: json['id'] as String,
      name: json['name'] as String,
      avatar: json['avatar'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, name, avatar];
}

class ReviewProduct extends Equatable {
  final String id;
  final String name;
  final List<String> images;
  final double avgRating;

  const ReviewProduct({
    required this.id,
    required this.name,
    required this.images,
    required this.avgRating,
  });

  String? get thumbnailUrl => images.isNotEmpty ? images.first : null;

  factory ReviewProduct.fromJson(Map<String, dynamic> json) {
    return ReviewProduct(
      id: json['id'] as String,
      name: json['name'] as String,
      images: List<String>.from(json['images'] as List? ?? []),
      avgRating: (json['avgRating'] as num? ?? 0).toDouble(),
    );
  }

  @override
  List<Object?> get props => [id, name, images, avgRating];
}

class ReviewModel extends Equatable {
  final String id;
  final String userId;
  final String productId;
  final int rating;
  final String? comment;
  final DateTime createdAt;
  final DateTime updatedAt;
  final ReviewUser? user;
  final ReviewProduct? product;

  const ReviewModel({
    required this.id,
    required this.userId,
    required this.productId,
    required this.rating,
    this.comment,
    required this.createdAt,
    required this.updatedAt,
    this.user,
    this.product,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      productId: json['productId'] as String,
      rating: json['rating'] as int,
      comment: json['comment'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      user: json['user'] != null
          ? ReviewUser.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      product: json['product'] != null
          ? ReviewProduct.fromJson(json['product'] as Map<String, dynamic>)
          : null,
    );
  }

  @override
  List<Object?> get props =>
      [id, userId, productId, rating, comment, createdAt, updatedAt, user, product];
}

class ReviewsPageData {
  final List<ReviewModel> items;
  final int total;
  final int page;
  final int totalPages;

  const ReviewsPageData({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
  });
}
