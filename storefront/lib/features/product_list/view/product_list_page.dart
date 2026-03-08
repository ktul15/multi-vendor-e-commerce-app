import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/product_filters.dart';
import '../../../shared/widgets/product_card.dart';
import '../bloc/product_list_cubit.dart';
import '../bloc/product_list_state.dart';
import '../widgets/filter_bottom_sheet.dart';
import '../widgets/product_list_item.dart';
import '../widgets/sort_bottom_sheet.dart';

class ProductListPage extends StatelessWidget {
  final String title;
  final ProductFilters initialFilters;

  const ProductListPage({
    super.key,
    this.title = 'Products',
    this.initialFilters = const ProductFilters(),
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          sl<ProductListCubit>()..loadProducts(filters: initialFilters),
      child: _ProductListView(title: title),
    );
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

class _ProductListView extends StatefulWidget {
  final String title;

  const _ProductListView({required this.title});

  @override
  State<_ProductListView> createState() => _ProductListViewState();
}

class _ProductListViewState extends State<_ProductListView> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final state = context.read<ProductListCubit>().state;
    if (state is! ProductListLoaded || state.isLoadingMore || !state.hasMore) {
      return;
    }
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.offset >= threshold) {
      context.read<ProductListCubit>().loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _ProductListAppBar(title: widget.title),
      body: BlocBuilder<ProductListCubit, ProductListState>(
        builder: (context, state) => switch (state) {
          ProductListInitial() || ProductListLoading() =>
            const _LoadingView(),
          ProductListError(:final message, :final filters) =>
            _ErrorView(message: message, filters: filters),
          ProductListLoaded() => _LoadedView(
              state: state,
              scrollController: _scrollController,
            ),
        },
      ),
    );
  }
}

// ── App bar ───────────────────────────────────────────────────────────────────

class _ProductListAppBar extends StatelessWidget
    implements PreferredSizeWidget {
  final String title;

  const _ProductListAppBar({required this.title});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductListCubit, ProductListState>(
      // Skip rebuilds triggered only by isLoadingMore changes — the app bar
      // doesn't show a loading indicator, so those rebuilds are wasted work.
      buildWhen: (prev, next) {
        if (prev is ProductListLoaded && next is ProductListLoaded) {
          return prev.filters != next.filters ||
              prev.total != next.total ||
              prev.viewMode != next.viewMode;
        }
        return prev.runtimeType != next.runtimeType;
      },
      builder: (context, state) {
        final cubit = context.read<ProductListCubit>();
        final filters = state is ProductListLoaded
            ? state.filters
            : state is ProductListError
                ? state.filters
                : const ProductFilters();
        final viewMode = state is ProductListLoaded
            ? state.viewMode
            : ProductListViewMode.grid;

        return AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title),
              if (state is ProductListLoaded)
                Text(
                  '${state.total} products',
                  style: AppTextStyles.caption,
                ),
            ],
          ),
          actions: [
            // Filter button with badge showing active filter count
            Stack(
              alignment: Alignment.topRight,
              children: [
                IconButton(
                  icon: const Icon(Icons.tune_rounded),
                  tooltip: 'Filter',
                  onPressed: () => FilterBottomSheet.show(
                    context,
                    current: filters,
                    onApply: cubit.applyFilters,
                  ),
                ),
                if (filters.activeFilterCount > 0)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '${filters.activeFilterCount}',
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.white,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // Sort button
            IconButton(
              icon: const Icon(Icons.sort_rounded),
              tooltip: 'Sort',
              onPressed: () => SortBottomSheet.show(
                context,
                current: filters.sort,
                onSelected: cubit.applySort,
              ),
            ),

            // Grid/list toggle
            IconButton(
              icon: Icon(
                viewMode == ProductListViewMode.grid
                    ? Icons.view_list_rounded
                    : Icons.grid_view_rounded,
              ),
              tooltip: 'Toggle view',
              onPressed: cubit.toggleViewMode,
            ),
          ],
        );
      },
    );
  }
}

// ── Loaded view ───────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  final ProductListLoaded state;
  final ScrollController scrollController;

  const _LoadedView({required this.state, required this.scrollController});

  @override
  Widget build(BuildContext context) {
    if (state.products.isEmpty) {
      return _EmptyState(filters: state.filters);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => context.read<ProductListCubit>().refresh(),
      child: state.viewMode == ProductListViewMode.grid
          ? _GridView(state: state, scrollController: scrollController)
          : _ListView(state: state, scrollController: scrollController),
    );
  }
}

class _GridView extends StatelessWidget {
  final ProductListLoaded state;
  final ScrollController scrollController;

  const _GridView({required this.state, required this.scrollController});

  @override
  Widget build(BuildContext context) {
    final itemCount =
        state.products.length + (state.isLoadingMore ? 1 : 0);

    return GridView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(AppSpacing.base),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.sm,
        mainAxisSpacing: AppSpacing.sm,
        childAspectRatio: 0.7,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (index >= state.products.length) {
          return const _LoadMoreIndicator();
        }
        return ProductCard(
          product: state.products[index],
          width: double.infinity,
          onTap: () {
            // TODO(#25): navigate to ProductDetailPage
          },
        );
      },
    );
  }
}

class _ListView extends StatelessWidget {
  final ProductListLoaded state;
  final ScrollController scrollController;

  const _ListView({required this.state, required this.scrollController});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      itemCount:
          state.products.length + (state.isLoadingMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= state.products.length) {
          return const _LoadMoreIndicator();
        }
        return ProductListItem(
          product: state.products[index],
          onTap: () {
            // TODO(#25): navigate to ProductDetailPage
          },
        );
      },
    );
  }
}

// ── Loading / error / empty states ────────────────────────────────────────────

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
    return GridView.builder(
      padding: const EdgeInsets.all(AppSpacing.base),
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.sm,
        mainAxisSpacing: AppSpacing.sm,
        childAspectRatio: 0.7,
      ),
      itemCount: 6,
      itemBuilder: (context, index) => _SkeletonCard(animation: _opacity),
    );
  }
}

/// All skeleton cards share a single [animation] driven by [_LoadingViewState]
/// so they pulse in perfect sync.
class _SkeletonCard extends StatelessWidget {
  final Animation<double> animation;

  const _SkeletonCard({required this.animation});

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: Container(color: Colors.grey[300], width: double.infinity),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Container(
                        height: 14,
                        width: double.infinity,
                        color: Colors.grey[300]),
                    Container(
                        height: 14, width: 80, color: Colors.grey[300]),
                    Container(
                        height: 12, width: 60, color: Colors.grey[300]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadMoreIndicator extends StatelessWidget {
  const _LoadMoreIndicator();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
      child: Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation(AppColors.primary),
          strokeWidth: 2,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final ProductFilters filters;

  const _EmptyState({required this.filters});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off_rounded,
            size: 72,
            color: AppColors.textSecondary.withAlpha(128),
          ),
          const SizedBox(height: AppSpacing.base),
          Text(
            'No products found',
            style: AppTextStyles.h5.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Try adjusting your filters',
            style:
                AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.xl),
          OutlinedButton(
            // resetFilters() clears user-applied filters while preserving the
            // navigation context (categoryId / vendorId).
            onPressed: () => context
                .read<ProductListCubit>()
                .applyFilters(filters.resetFilters()),
            child: const Text('Clear Filters'),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final ProductFilters filters;

  const _ErrorView({required this.message, required this.filters});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 72, color: Colors.grey),
            const SizedBox(height: AppSpacing.base),
            Text(
              'Something went wrong',
              style: AppTextStyles.h5.copyWith(color: AppColors.textPrimary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: () => context
                  .read<ProductListCubit>()
                  .loadProducts(filters: filters),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
