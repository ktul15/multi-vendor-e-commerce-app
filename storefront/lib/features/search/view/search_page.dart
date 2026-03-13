import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../bloc/search_cubit.dart';
import '../bloc/search_state.dart';
import '../../../features/product_list/widgets/product_list_item.dart';

class SearchPage extends StatelessWidget {
  const SearchPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<SearchCubit>()..init(),
      child: const _SearchView(),
    );
  }
}

// ── View ──────────────────────────────────────────────────────────────────────

class _SearchView extends StatefulWidget {
  const _SearchView();

  @override
  State<_SearchView> createState() => _SearchViewState();
}

class _SearchViewState extends State<_SearchView> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _scrollController = ScrollController();
  // Guards against loadMore() firing multiple times per fling before the
  // cubit's isLoadingMore state propagates back to this widget.
  bool _isPaginating = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Autofocus after the first frame so the keyboard opens immediately.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final state = context.read<SearchCubit>().state;
    if (_isPaginating ||
        state is! SearchLoaded ||
        state.isLoadingMore ||
        !state.hasMore) {
      return;
    }
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.offset >= threshold) {
      _isPaginating = true;
      context.read<SearchCubit>().loadMore().then((_) {
        if (mounted) setState(() => _isPaginating = false);
      });
    }
  }

  void _onQueryChanged(String value) {
    context.read<SearchCubit>().search(value);
  }

  void _onClear() {
    _controller.clear();
    context.read<SearchCubit>().clear();
    _focusNode.requestFocus();
  }

  void _onRecentTap(String query) {
    _controller.text = query;
    _controller.selection = TextSelection.fromPosition(
      TextPosition(offset: query.length),
    );
    context.read<SearchCubit>().search(query);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _SearchBar(
        controller: _controller,
        focusNode: _focusNode,
        onChanged: _onQueryChanged,
        onClear: _onClear,
      ),
      body: BlocBuilder<SearchCubit, SearchState>(
        builder: (context, state) => switch (state) {
          SearchIdle(:final recentSearches) => _IdleView(
              recentSearches: recentSearches,
              onRecentTap: _onRecentTap,
            ),
          SearchLoading() => const _LoadingView(),
          SearchLoaded() => _ResultsView(
              state: state,
              scrollController: _scrollController,
            ),
          SearchError(:final query, :final message) => _ErrorView(
              query: query,
              message: message,
            ),
        },
      ),
    );
  }
}

// ── Search bar (PreferredSizeWidget) ──────────────────────────────────────────

class _SearchBar extends StatelessWidget implements PreferredSizeWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _SearchBar({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      titleSpacing: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded),
        onPressed: () => context.pop(),
      ),
      title: TextField(
        controller: controller,
        focusNode: focusNode,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        style: AppTextStyles.body.copyWith(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: 'Search products…',
          hintStyle:
              AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: EdgeInsets.zero,
        ),
      ),
      actions: [
        // Clear button — shown only while there is text.
        ValueListenableBuilder<TextEditingValue>(
          valueListenable: controller,
          builder: (context, value, _) {
            if (value.text.isEmpty) return const SizedBox.shrink();
            return IconButton(
              icon: const Icon(Icons.close_rounded),
              tooltip: 'Clear search',
              onPressed: onClear,
            );
          },
        ),
      ],
    );
  }
}

// ── Idle (recent searches) ────────────────────────────────────────────────────

class _IdleView extends StatelessWidget {
  final List<String> recentSearches;
  final ValueChanged<String> onRecentTap;

  const _IdleView({
    required this.recentSearches,
    required this.onRecentTap,
  });

  @override
  Widget build(BuildContext context) {
    if (recentSearches.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.search_rounded,
              size: 72,
              color: AppColors.textSecondary.withAlpha(100), // ~40% opacity
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Search for products',
              style:
                  AppTextStyles.h5.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Start typing to find what you\'re looking for',
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.base,
            AppSpacing.base,
            AppSpacing.base,
            AppSpacing.xs,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent searches', style: AppTextStyles.h6),
              TextButton(
                onPressed: () =>
                    context.read<SearchCubit>().clearAllRecentSearches(),
                child: Text(
                  'Clear all',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: recentSearches.length,
            itemBuilder: (context, index) {
              final query = recentSearches[index];
              return ListTile(
                leading: const Icon(
                  Icons.history_rounded,
                  color: AppColors.textSecondary,
                ),
                title: Text(query, style: AppTextStyles.body),
                trailing: IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  color: AppColors.textSecondary,
                  onPressed: () =>
                      context.read<SearchCubit>().removeRecentSearch(query),
                ),
                onTap: () => onRecentTap(query),
              );
            },
          ),
        ),
      ],
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
  late final AnimationController _animController;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: 6,
      itemBuilder: (context, _) => _SkeletonItem(animation: _animation),
    );
  }
}

class _SkeletonItem extends StatelessWidget {
  final Animation<double> animation;

  const _SkeletonItem({required this.animation});

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: Card(
        margin: const EdgeInsets.symmetric(
          horizontal: AppSpacing.base,
          vertical: AppSpacing.xs,
        ),
        child: SizedBox(
          height: 110,
          child: Row(
            children: [
              Container(
                width: 110,
                height: 110,
                color: AppColors.border,
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Container(
                        height: 14,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        height: 14,
                        width: 120,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      Container(
                        height: 14,
                        width: 80,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Results ───────────────────────────────────────────────────────────────────

class _ResultsView extends StatelessWidget {
  final SearchLoaded state;
  final ScrollController scrollController;

  const _ResultsView({required this.state, required this.scrollController});

  @override
  Widget build(BuildContext context) {
    if (state.products.isEmpty) {
      return _EmptyResults(query: state.query);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.base,
            vertical: AppSpacing.sm,
          ),
          child: Text(
            '${state.total} result${state.total == 1 ? '' : 's'} for "${state.query}"',
            style:
                AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
          ),
        ),
        Expanded(
          child: ListView.builder(
            controller: scrollController,
            itemCount: state.products.length + (state.isLoadingMore ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == state.products.length) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpacing.base),
                  child: Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primary,
                      strokeWidth: 2,
                    ),
                  ),
                );
              }
              final product = state.products[index];
              return ProductListItem(
                product: product,
                onTap: () => context.pushNamed(
                  AppRoutes.productDetailName,
                  pathParameters: {'id': product.id},
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _EmptyResults extends StatelessWidget {
  final String query;

  const _EmptyResults({required this.query});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.search_off_rounded,
            size: 72,
            color: AppColors.textSecondary.withAlpha(100),
          ),
          const SizedBox(height: AppSpacing.md),
          Text('No results found', style: AppTextStyles.h5),
          const SizedBox(height: AppSpacing.xs),
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
            child: Text(
              'We couldn\'t find anything for "$query".\nTry different keywords.',
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Error ─────────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String query;
  final String message;

  const _ErrorView({required this.query, required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 72,
              color: AppColors.error,
            ),
            const SizedBox(height: AppSpacing.md),
            Text('Something went wrong', style: AppTextStyles.h5),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message,
              style:
                  AppTextStyles.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: () => context.read<SearchCubit>().search(query),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
