/// Shared dimension constants to keep layouts pixel-aligned across
/// skeleton and loaded states.
class AppDimensions {
  AppDimensions._();

  static const double bannerHeight = 180.0;
  static const double productCardWidth = 160.0;
  // Square thumbnail (160) + two-line title, price, rating, padding, and
  // Card's vertical margin. Keep this in sync with ProductCard content.
  static const double productListHeight = 272.0;
  static const double categoryTileSize = 56.0;
}
