import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/cart_model.dart';
import '../bloc/cart_cubit.dart';
import '../bloc/cart_state.dart';
import '../widgets/cart_summary_card.dart';
import '../widgets/cart_vendor_section.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../widgets/cart_skeleton.dart';
import '../widgets/empty_cart.dart';
import '../widgets/promo_code_input.dart';

class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: sl<CartCubit>()..loadCart(),
      child: const _CartView(),
    );
  }
}

class _CartView extends StatelessWidget {
  const _CartView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CartCubit, CartState>(
      listener: (context, state) {
        // Only show a SnackBar for hard errors (no previous cart to fall back on).
        // When previousCart != null, the error banner inside _CartScaffold is shown instead.
        if (state is CartError && state.previousCart == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.error,
            ),
          );
        }
      },
      builder: (context, state) {
        return switch (state) {
          CartInitial() || CartLoading() => Scaffold(
              appBar: AppBar(title: const Text('My Cart')),
              body: SkeletonContainer(child: const CartSkeleton()),
            ),
          CartError(:final previousCart, :final message)
              when previousCart == null =>
            Scaffold(
              appBar: AppBar(title: const Text('My Cart')),
              body: ErrorState(
                message: message,
                onRetry: () => context.read<CartCubit>().loadCart(),
              ),
            ),
          CartError(:final previousCart) => _CartScaffold(
              cart: previousCart!,
              promoPreview: null,
              isUpdating: false,
              isApplyingPromo: false,
              promoError: null,
              errorBanner: true,
            ),
          CartLoaded(
            :final cart,
            :final promoPreview,
            :final isUpdating,
            :final isApplyingPromo,
            :final promoError,
          ) =>
            _CartScaffold(
              cart: cart,
              promoPreview: promoPreview,
              isUpdating: isUpdating,
              isApplyingPromo: isApplyingPromo,
              promoError: promoError,
            ),
        };
      },
    );
  }
}

// ── Cart scaffold ─────────────────────────────────────────────────────────────

class _CartScaffold extends StatelessWidget {
  final CartModel cart;
  final PromoPreviewModel? promoPreview;
  final bool isUpdating;
  final bool isApplyingPromo;
  final String? promoError;
  final bool errorBanner;

  const _CartScaffold({
    required this.cart,
    required this.promoPreview,
    required this.isUpdating,
    required this.isApplyingPromo,
    required this.promoError,
    this.errorBanner = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: cart.isEmpty
          ? CustomScrollView(
              slivers: [
                const SliverAppBar(
                  title: Text('My Cart'),
                  floating: true,
                ),
                const SliverFillRemaining(child: EmptyCartWidget()),
              ],
            )
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  title: const Text('My Cart'),
                  floating: true,
                  bottom: PreferredSize(
                    preferredSize: const Size.fromHeight(20),
                    child: Padding(
                      padding:
                          const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Text(
                        '${cart.itemCount} ${cart.itemCount == 1 ? 'item' : 'items'}',
                        style: AppTextStyles.caption,
                      ),
                    ),
                  ),
                ),
                if (errorBanner)
                  SliverToBoxAdapter(
                    child: Container(
                      color: AppColors.error.withAlpha(25),
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.base,
                        vertical: AppSpacing.sm,
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded,
                              size: 16, color: AppColors.error),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: Text(
                              'Failed to update cart. Please try again.',
                              style: AppTextStyles.caption
                                  .copyWith(color: AppColors.error),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => CartVendorSection(
                      group: cart.vendorGroups[index],
                      isUpdating: isUpdating,
                    ),
                    childCount: cart.vendorGroups.length,
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.base),
                    child: PromoCodeInput(
                      isApplyingPromo: isApplyingPromo,
                      activePromoCode: promoPreview?.code,
                      promoError: promoError,
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: CartSummaryCard(
                    subtotal: cart.subtotal,
                    promoPreview: promoPreview,
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.base,
                      AppSpacing.sm,
                      AppSpacing.base,
                      AppSpacing.xl,
                    ),
                    child: ElevatedButton(
                      onPressed: () => context.push(AppRoutes.checkout),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.md),
                      ),
                      child: const Text('Proceed to Checkout'),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

