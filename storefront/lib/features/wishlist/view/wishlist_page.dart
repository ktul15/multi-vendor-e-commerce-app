import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../cart/bloc/cart_cubit.dart';
import '../bloc/wishlist_cubit.dart';
import '../bloc/wishlist_state.dart';
import '../widgets/wishlist_item_tile.dart';
import '../widgets/wishlist_skeleton.dart';

class WishlistPage extends StatefulWidget {
  const WishlistPage({super.key});

  @override
  State<WishlistPage> createState() => _WishlistPageState();
}

class _WishlistPageState extends State<WishlistPage> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    sl<WishlistCubit>().loadWishlist();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      sl<WishlistCubit>().loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: sl<WishlistCubit>()),
        BlocProvider.value(value: sl<CartCubit>()),
      ],
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Wishlist')),
        body: BlocBuilder<WishlistCubit, WishlistState>(
          builder: (context, state) {
            if (state is WishlistInitial) {
              return SkeletonContainer(child: const WishlistSkeleton());
            }

            final loaded = state as WishlistLoaded;

            if (loaded.isLoading) {
              return SkeletonContainer(child: const WishlistSkeleton());
            }

            if (loaded.items.isEmpty) {
              return EmptyState(
                icon: Icons.favorite_outline,
                title: 'Your wishlist is empty',
                subtitle: 'Save items you love for later',
                actionLabel: 'Browse Products',
                onAction: () => context.go(AppRoutes.home),
              );
            }

            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => sl<WishlistCubit>().loadWishlist(),
              child: ListView.separated(
                controller: _scrollController,
                itemCount:
                    loaded.items.length + (loaded.isLoadingMore ? 1 : 0),
                separatorBuilder: (_, _) =>
                    const Divider(height: 1, indent: AppSpacing.base),
                itemBuilder: (context, index) {
                  if (index == loaded.items.length) {
                    return const Padding(
                      padding: EdgeInsets.all(AppSpacing.base),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }

                  final item = loaded.items[index];
                  return Dismissible(
                    key: ValueKey(item.id),
                    direction: DismissDirection.endToStart,
                    background: Container(
                      alignment: Alignment.centerRight,
                      padding: const EdgeInsets.only(right: AppSpacing.xl),
                      color: AppColors.error,
                      child: const Icon(
                        Icons.delete_outline,
                        color: Colors.white,
                      ),
                    ),
                    confirmDismiss: (_) async {
                      try {
                        await context
                            .read<WishlistCubit>()
                            .removeProduct(item.productId);
                        return true;
                      } catch (_) {
                        return false;
                      }
                    },
                    child: WishlistItemTile(
                      item: item,
                      onTap: () => context.pushNamed(
                        AppRoutes.productDetailName,
                        pathParameters: {'id': item.productId},
                      ),
                      onRemove: () => context
                          .read<WishlistCubit>()
                          .removeProduct(item.productId),
                      onMoveToCart: () {
                        context.read<CartCubit>().addItem(item.productId, 1);
                        context
                            .read<WishlistCubit>()
                            .removeProduct(item.productId);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                                '${item.product.name} moved to cart'),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
