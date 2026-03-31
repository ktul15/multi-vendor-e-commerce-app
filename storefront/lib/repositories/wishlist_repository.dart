import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/wishlist_model.dart';

class WishlistRepository {
  final HttpClient _client;

  WishlistRepository({required HttpClient client}) : _client = client;

  /// Fetch the user's wishlist with pagination.
  Future<WishlistPageData> getWishlist({
    int page = 1,
    int limit = 10,
  }) async {
    final body = await _client.get(
      '/wishlist',
      queryParameters: {'page': '$page', 'limit': '$limit'},
    );

    if (body == null ||
        body['data'] is! Map ||
        (body['data'] as Map)['items'] is! List ||
        (body['data'] as Map)['meta'] is! Map) {
      throw const ApiException('Failed to load wishlist');
    }

    final data = body['data'] as Map<String, dynamic>;
    final meta = data['meta'] as Map<String, dynamic>;

    return WishlistPageData(
      items: (data['items'] as List<dynamic>)
          .map((e) => WishlistItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      totalPages: meta['totalPages'] as int,
    );
  }

  /// Toggle a product in the wishlist (add if absent, remove if present).
  /// Returns the action taken: 'added' or 'removed'.
  Future<String> toggle(String productId) async {
    final body = await _client.post(
      '/wishlist',
      data: {'productId': productId},
    );

    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to update wishlist');
    }

    return (body['data'] as Map)['action'] as String;
  }

  /// Explicitly remove a product from the wishlist.
  Future<void> remove(String productId) async {
    await _client.delete('/wishlist/${Uri.encodeComponent(productId)}');
  }
}
