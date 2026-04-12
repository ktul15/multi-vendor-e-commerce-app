import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../cart/bloc/cart_cubit.dart';
import '../../wishlist/bloc/wishlist_cubit.dart';
import '../../wishlist/bloc/wishlist_state.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/product_detail_cubit.dart';
import '../bloc/product_detail_state.dart';
import '../../reviews/widgets/star_rating_display.dart';
import '../widgets/product_image_gallery.dart';
import '../widgets/variant_selector.dart';

class ProductDetailPage extends StatelessWidget {
  final String productId;

  const ProductDetailPage({super.key, required this.productId});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
            create: (_) =>
                sl<ProductDetailCubit>()..loadProduct(productId)),
        BlocProvider.value(value: sl<CartCubit>()),
        BlocProvider.value(value: sl<WishlistCubit>()),
      ],
      child: const _ProductDetailView(),
    );
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

class _ProductDetailView extends StatelessWidget {
  const _ProductDetailView();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductDetailCubit, ProductDetailState>(
      builder: (context, state) => switch (state) {
        ProductDetailInitial() || ProductDetailLoading() =>
          const _LoadingView(),
        ProductDetailError(:final message, :final productId) =>
          _ErrorView(message: message, productId: productId),
        ProductDetailLoaded() => _LoadedView(state: state),
      },
    );
  }
}

// ── Loaded view ───────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  final ProductDetailLoaded state;

  const _LoadedView({required this.state});

  @override
  Widget build(BuildContext context) {
    final product = state.product;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Collapsible image header
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.textPrimary,
            flexibleSpace: FlexibleSpaceBar(
              background: ProductImageGallery(images: product.images),
            ),
            actions: [
              BlocBuilder<WishlistCubit, WishlistState>(
                builder: (context, wishlistState) {
                  final isWishlisted = wishlistState is WishlistLoaded &&
                      wishlistState.isInWishlist(product.id);
                  return IconButton(
                    onPressed: () =>
                        context.read<WishlistCubit>().toggleProduct(product.id),
                    icon: Icon(
                      isWishlisted ? Icons.favorite : Icons.favorite_outline,
                      color: isWishlisted ? AppColors.secondary : null,
                    ),
                  );
                },
              ),
            ],
          ),

          // Main content
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.base,
                    AppSpacing.base,
                    AppSpacing.base,
                    0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Breadcrumb: category + stock badge
                      Row(
                        children: [
                          if (product.categoryName != null) ...[
                            Icon(
                              Icons.category_outlined,
                              size: 14,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Text(
                              product.categoryName!,
                              style: AppTextStyles.caption,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                          ],
                          const Spacer(),
                          _StockBadge(inStock: state.isInStock),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      // Product name
                      Text(product.name, style: AppTextStyles.h3),
                      const SizedBox(height: AppSpacing.sm),

                      // Price + rating
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            '\$${state.displayPrice.toStringAsFixed(2)}',
                            style: AppTextStyles.h3.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                          const Spacer(),
                          if (product.avgRating > 0) ...[
                            const Icon(
                              Icons.star_rounded,
                              size: 18,
                              color: AppColors.rating,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Text(
                              product.avgRating.toStringAsFixed(1),
                              style: AppTextStyles.body.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (product.reviewCount > 0) ...[
                              const SizedBox(width: AppSpacing.xs),
                              Text(
                                '(${product.reviewCount})',
                                style: AppTextStyles.caption,
                              ),
                            ],
                          ],
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      // Vendor chip
                      if (product.vendorName != null)
                        Row(
                          children: [
                            const Icon(
                              Icons.storefront_outlined,
                              size: 14,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(width: AppSpacing.xs),
                            Text(
                              product.vendorName!,
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),

                      // Tags
                      if (product.tags.isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(
                          spacing: AppSpacing.xs,
                          runSpacing: AppSpacing.xs,
                          children: product.tags.map((tag) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color:
                                    AppColors.primary.withAlpha(20),
                                borderRadius: BorderRadius.circular(
                                    AppRadius.full),
                              ),
                              child: Text(
                                tag,
                                style: AppTextStyles.caption.copyWith(
                                  color: AppColors.primary,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.base),
                const Divider(height: 1),

                // Variant selector
                if (product.variants.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.all(AppSpacing.base),
                    child: VariantSelector(
                      variants: product.variants,
                      selected: state.selectedVariant,
                      onSelect: context
                          .read<ProductDetailCubit>()
                          .selectVariant,
                    ),
                  ),
                  const Divider(height: 1),
                ],

                // Description
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Description', style: AppTextStyles.h5),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        product.description,
                        style: AppTextStyles.body.copyWith(
                          color: AppColors.textSecondary,
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                ),

                // Reviews section
                const Divider(height: 1),
                _ReviewsSection(
                  productId: product.id,
                  productName: product.name,
                  avgRating: product.avgRating,
                  reviewCount: product.reviewCount,
                ),

                // Bottom padding so the fixed bar doesn't obscure content
                const SizedBox(height: AppSpacing.massive + AppSpacing.xl),
              ],
            ),
          ),
        ],
      ),

      // Sticky add-to-cart bar
      bottomNavigationBar: _AddToCartBar(state: state),
    );
  }
}

// ── Add to cart bar ───────────────────────────────────────────────────────────

class _AddToCartBar extends StatelessWidget {
  final ProductDetailLoaded state;

  const _AddToCartBar({required this.state});

  @override
  Widget build(BuildContext context) {
    final needsVariant =
        state.product.variants.isNotEmpty && state.selectedVariant == null;

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.base,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(15),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Price summary
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                Text(
                  'Total',
                  style: AppTextStyles.caption,
                ),
                Text(
                  '\$${state.displayPrice.toStringAsFixed(2)}',
                  style: AppTextStyles.h4.copyWith(color: AppColors.primary),
                ),
              ],
            ),
            const SizedBox(width: AppSpacing.base),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: state.isInStock && !needsVariant
                    ? () {
                        final variantId = state.selectedVariant?.id ??
                            state.product.variants.first.id;
                        context
                            .read<CartCubit>()
                            .addItem(variantId, 1);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content:
                                Text('${state.product.name} added to cart'),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    : null,
                icon: const Icon(Icons.shopping_cart_outlined, size: 20),
                label: Text(
                  needsVariant
                      ? 'Select options'
                      : state.isInStock
                          ? 'Add to Cart'
                          : 'Out of Stock',
                ),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    vertical: AppSpacing.md,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Stock badge ───────────────────────────────────────────────────────────────

class _StockBadge extends StatelessWidget {
  final bool inStock;

  const _StockBadge({required this.inStock});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: inStock
            ? AppColors.success.withAlpha(26)
            : AppColors.error.withAlpha(26),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        inStock ? 'In Stock' : 'Out of Stock',
        style: AppTextStyles.caption.copyWith(
          color: inStock ? AppColors.success : AppColors.error,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Reviews section ──────────────────────────────────────────────────────────

class _ReviewsSection extends StatelessWidget {
  final String productId;
  final String productName;
  final double avgRating;
  final int reviewCount;

  const _ReviewsSection({
    required this.productId,
    required this.productName,
    required this.avgRating,
    required this.reviewCount,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Reviews', style: AppTextStyles.h5),
              if (reviewCount > 0) ...[
                const SizedBox(width: AppSpacing.sm),
                Text(
                  '($reviewCount)',
                  style: AppTextStyles.caption,
                ),
              ],
              const Spacer(),
              if (reviewCount > 0)
                TextButton(
                  onPressed: () => context.pushNamed(
                    AppRoutes.reviewsName,
                    pathParameters: {'id': productId},
                    queryParameters: {
                      'productName': productName,
                      'avgRating': avgRating.toString(),
                      'reviewCount': reviewCount.toString(),
                    },
                  ),
                  child: const Text('See all'),
                ),
            ],
          ),
          if (reviewCount > 0) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                StarRatingDisplay(rating: avgRating, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  '${avgRating.toStringAsFixed(1)} out of 5',
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'No reviews yet',
              style: AppTextStyles.body.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.pushNamed(
                AppRoutes.writeReviewName,
                pathParameters: {'id': productId},
              ),
              icon: const Icon(Icons.rate_review_outlined, size: 18),
              label: const Text('Write a Review'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

class _LoadingView extends StatefulWidget {
  const _LoadingView();

  @override
  State<_LoadingView> createState() => _LoadingViewState();
}

class _LoadingViewState extends State<_LoadingView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _opacity = Tween<double>(begin: 0.25, end: 0.6).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.surface),
      body: FadeTransition(
        opacity: _opacity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 320, color: Colors.grey[300]),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.base),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                      height: 14, width: 120, color: Colors.grey[300]),
                  const SizedBox(height: AppSpacing.md),
                  Container(
                      height: 22,
                      width: double.infinity,
                      color: Colors.grey[300]),
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                      height: 22, width: 200, color: Colors.grey[300]),
                  const SizedBox(height: AppSpacing.base),
                  Container(
                      height: 28, width: 100, color: Colors.grey[300]),
                  const SizedBox(height: AppSpacing.xl),
                  Container(
                      height: 14,
                      width: double.infinity,
                      color: Colors.grey[300]),
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                      height: 14,
                      width: double.infinity,
                      color: Colors.grey[300]),
                  const SizedBox(height: AppSpacing.sm),
                  Container(
                      height: 14, width: 240, color: Colors.grey[300]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  final String productId;

  const _ErrorView({required this.message, required this.productId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(backgroundColor: AppColors.surface),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 72, color: Colors.grey),
              const SizedBox(height: AppSpacing.base),
              Text(
                'Something went wrong',
                style: AppTextStyles.h5.copyWith(
                    color: AppColors.textPrimary),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                message,
                style: AppTextStyles.body
                    .copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton.icon(
                onPressed: () => context
                    .read<ProductDetailCubit>()
                    .loadProduct(productId),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
