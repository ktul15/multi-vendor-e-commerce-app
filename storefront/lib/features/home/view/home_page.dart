import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/category_model.dart';
import '../../../shared/models/product_model.dart';
import '../bloc/home_cubit.dart';
import '../bloc/home_state.dart';
import '../widgets/banner_carousel.dart';
import '../widgets/category_grid_section.dart';
import '../widgets/home_skeleton.dart';
import '../widgets/product_section.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<HomeCubit>()..loadHome(),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // NOTE: Widgets in this file use static AppColors constants for
      // consistency with the rest of the app. Dark-mode support requires
      // migrating to Theme.of(context).colorScheme across the project —
      // tracked separately, not in scope for issue #23.
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: BlocBuilder<HomeCubit, HomeState>(
          builder: (context, state) {
            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => context.read<HomeCubit>().refresh(),
              child: switch (state) {
                HomeInitial() || HomeLoading() => const HomeSkeleton(),
                HomeError(:final message) => _ErrorView(message: message),
                HomeLoaded(
                  :final categories,
                  :final trendingProducts,
                  :final newArrivals,
                ) =>
                  _LoadedView(
                    categories: categories,
                    trendingProducts: trendingProducts,
                    newArrivals: newArrivals,
                  ),
              },
            );
          },
        ),
      ),
    );
  }
}

// ── App bar ──────────────────────────────────────────────────────────────────

class _HomeAppBar extends StatelessWidget {
  const _HomeAppBar();

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning! ☀️';
    if (hour < 17) return 'Good afternoon! 👋';
    return 'Good evening! 🌙';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.base,
        AppSpacing.base,
        AppSpacing.base,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _greeting(),
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                Text('Discover Products', style: AppTextStyles.h4),
              ],
            ),
          ),
          IconButton(
            onPressed: () => context.pushNamed(AppRoutes.searchName),
            icon: const Icon(Icons.search_rounded),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surface,
              foregroundColor: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          IconButton(
            onPressed: () {
              // TODO(cart issue): navigate to CartScreen
            },
            icon: const Icon(Icons.shopping_cart_outlined),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surface,
              foregroundColor: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Loaded view ───────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  final List<CategoryModel> categories;
  final List<ProductModel> trendingProducts;
  final List<ProductModel> newArrivals;

  const _LoadedView({
    required this.categories,
    required this.trendingProducts,
    required this.newArrivals,
  });

  @override
  Widget build(BuildContext context) {
    // Show up to 8 categories in the grid
    final displayCategories = categories.take(8).toList();

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        const SliverToBoxAdapter(child: _HomeAppBar()),
        const SliverToBoxAdapter(child: BannerCarousel()),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),

        if (displayCategories.isNotEmpty) ...[
          const SliverToBoxAdapter(
            child: _SectionTitle('Categories'),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
          // SliverGrid avoids shrinkWrap + GridView performance pitfall
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
            sliver: SliverGrid(
              delegate: SliverChildBuilderDelegate(
                (context, index) =>
                    CategoryTile(category: displayCategories[index]),
                childCount: displayCategories.length,
              ),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: AppSpacing.md,
                crossAxisSpacing: AppSpacing.md,
                childAspectRatio: 0.8,
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
        ],

        if (trendingProducts.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: ProductSection(
              title: '🔥 Trending',
              products: trendingProducts,
              onSeeAll: () => context.pushNamed(
                AppRoutes.productsName,
                queryParameters: {'title': 'Trending'},
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
        ],

        if (newArrivals.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: ProductSection(
              title: '✨ New Arrivals',
              products: newArrivals,
              onSeeAll: () => context.pushNamed(
                AppRoutes.productsName,
                queryParameters: {'title': 'New Arrivals'},
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
        ],

        if (displayCategories.isEmpty &&
            trendingProducts.isEmpty &&
            newArrivals.isEmpty)
          const SliverFillRemaining(child: _EmptyState()),
      ],
    );
  }
}

// ── Section title ─────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
      child: Text(title, style: AppTextStyles.h5),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.storefront_outlined,
            size: 72,
            color: AppColors.textSecondary.withAlpha(128),
          ),
          const SizedBox(height: AppSpacing.base),
          Text(
            'No products yet',
            style: AppTextStyles.h5.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Check back soon for new arrivals',
            style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;

  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    // ListView enables pull-to-refresh even in the error state.
    // SizedBox.expand fills the available viewport without relying on
    // MediaQuery.size.height which doesn't account for safe-area insets.
    return ListView(
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height -
              MediaQuery.of(context).padding.top -
              MediaQuery.of(context).padding.bottom -
              kToolbarHeight,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.wifi_off_rounded,
                size: 72,
                color: Colors.grey,
              ),
              const SizedBox(height: AppSpacing.base),
              Text(
                'Something went wrong',
                style:
                    AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
              ),
              const SizedBox(height: AppSpacing.sm),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                child: Text(
                  message,
                  style: AppTextStyles.body.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton.icon(
                onPressed: () => context.read<HomeCubit>().refresh(),
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Dimensions ────────────────────────────────────────────────────────────────
// See AppDimensions in core/theme/app_dimensions.dart for shared constants
// (bannerHeight, productCardWidth, productListHeight, categoryTileSize).
// Banner height is shared between BannerCarousel and HomeSkeleton to keep
// the skeleton-to-loaded transition pixel-aligned.
