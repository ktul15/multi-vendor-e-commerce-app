import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/review_model.dart';

class ReviewRepository {
  final HttpClient _client;

  ReviewRepository({required HttpClient client}) : _client = client;

  /// Fetch reviews for a product with pagination and optional filtering.
  Future<ReviewsPageData> getProductReviews({
    required String productId,
    int page = 1,
    int limit = 10,
    int? rating,
    String? sort,
  }) async {
    final params = <String, String>{
      'page': '$page',
      'limit': '$limit',
    };
    if (rating != null) params['rating'] = '$rating';
    if (sort != null) params['sort'] = sort;

    final body = await _client.get(
      '/reviews/product/${Uri.encodeComponent(productId)}',
      queryParameters: params,
    );

    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const ApiException('Failed to load reviews');
    }

    final data = body['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>;

    return ReviewsPageData(
      items: (data['items'] as List<dynamic>)
          .map((e) => ReviewModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }

  /// Fetch the current user's reviews with pagination.
  Future<ReviewsPageData> getMyReviews({
    int page = 1,
    int limit = 10,
  }) async {
    final body = await _client.get(
      '/reviews/my-reviews',
      queryParameters: {'page': '$page', 'limit': '$limit'},
    );

    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const ApiException('Failed to load your reviews');
    }

    final data = body['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>;

    return ReviewsPageData(
      items: (data['items'] as List<dynamic>)
          .map((e) => ReviewModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }

  /// Create a new review for a product.
  Future<ReviewModel> createReview({
    required String productId,
    required int rating,
    String? comment,
  }) async {
    final payload = <String, dynamic>{
      'productId': productId,
      'rating': rating,
    };
    if (comment != null && comment.isNotEmpty) {
      payload['comment'] = comment;
    }

    final body = await _client.post('/reviews', data: payload);

    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to create review');
    }

    return ReviewModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  /// Update an existing review.
  Future<ReviewModel> updateReview({
    required String reviewId,
    int? rating,
    String? comment,
  }) async {
    final payload = <String, dynamic>{};
    if (rating != null) payload['rating'] = rating;
    if (comment != null) payload['comment'] = comment.isEmpty ? null : comment;

    final body = await _client.put(
      '/reviews/${Uri.encodeComponent(reviewId)}',
      data: payload,
    );

    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to update review');
    }

    return ReviewModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  /// Delete a review.
  Future<void> deleteReview(String reviewId) async {
    await _client.delete('/reviews/${Uri.encodeComponent(reviewId)}');
  }
}
