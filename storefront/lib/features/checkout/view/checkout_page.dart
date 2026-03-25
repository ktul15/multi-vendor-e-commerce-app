import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/models/address_model.dart';
import '../bloc/checkout_bloc.dart';
import '../bloc/checkout_event.dart';
import '../bloc/checkout_state.dart';
import '../widgets/add_address_form.dart';
import '../widgets/address_list_tile.dart';
import '../widgets/checkout_price_summary.dart';
import '../widgets/checkout_step_indicator.dart';
import '../widgets/order_summary_section.dart';

class CheckoutPage extends StatelessWidget {
  const CheckoutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<CheckoutBloc>()..add(const CheckoutStarted()),
      child: const _CheckoutView(),
    );
  }
}

// ── Main view ────────────────────────────────────────────────────────────────

class _CheckoutView extends StatelessWidget {
  const _CheckoutView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<CheckoutBloc, CheckoutState>(
      listener: (context, state) {
        if (state is CheckoutSuccess) {
          context.go(AppRoutes.checkoutSuccess, extra: state.order);
        }
      },
      builder: (context, state) {
        return switch (state) {
          CheckoutAddressesLoading() => const _LoadingScaffold(title: 'Checkout'),
          CheckoutAddressStep() => _AddressStepBody(state: state),
          CheckoutSummaryStep() => _SummaryStepBody(state: state),
          CheckoutPaymentInProgress() => const _LoadingScaffold(
              title: 'Processing',
              message: 'Processing your payment…',
            ),
          // Navigation is handled by the listener; render nothing for one frame.
          CheckoutSuccess() => const SizedBox.shrink(),
          CheckoutError() => _ErrorBody(state: state),
        };
      },
    );
  }
}

// ── Address step ─────────────────────────────────────────────────────────────

class _AddressStepBody extends StatelessWidget {
  final CheckoutAddressStep state;

  const _AddressStepBody({required this.state});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Checkout')),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.base,
                AppSpacing.base,
                AppSpacing.base,
                AppSpacing.xl,
              ),
              child: const CheckoutStepIndicator(currentStep: 1),
            ),
          ),
          if (state.error != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.error.withAlpha(25),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    state.error!,
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.error),
                  ),
                ),
              ),
            ),
          if (state.addresses.isEmpty)
            const SliverFillRemaining(
              child: Center(
                child: Text(
                  'No addresses yet.\nTap + to add one.',
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final addr = state.addresses[i];
                  return AddressListTile(
                    address: addr,
                    isSelected: state.selectedAddress?.id == addr.id,
                    onTap: () => ctx
                        .read<CheckoutBloc>()
                        .add(CheckoutAddressSelected(addr)),
                  );
                },
                childCount: state.addresses.length,
              ),
            ),
          SliverToBoxAdapter(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () => _openAddForm(context),
                  icon: const Icon(Icons.add),
                  label: const Text('Add new address'),
                ),
                TextButton(
                  onPressed: () async {
                    await context.push(AppRoutes.addresses);
                    // Reload addresses so any additions/edits made on the
                    // management screen appear here without restarting checkout.
                    if (context.mounted) {
                      context
                          .read<CheckoutBloc>()
                          .add(const CheckoutStarted());
                    }
                  },
                  child: const Text('Manage saved addresses →'),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.base,
            AppSpacing.sm,
            AppSpacing.base,
            AppSpacing.base,
          ),
          child: ElevatedButton(
            onPressed: state.selectedAddress == null || state.isAddingAddress
                ? null
                : () => context
                    .read<CheckoutBloc>()
                    .add(const CheckoutProceedToSummary()),
            style: ElevatedButton.styleFrom(
              padding:
                  const EdgeInsets.symmetric(vertical: AppSpacing.md),
            ),
            child: state.isAddingAddress
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Continue'),
          ),
        ),
      ),
    );
  }

  void _openAddForm(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => BlocProvider.value(
        value: context.read<CheckoutBloc>(),
        child: const AddAddressSheet(),
      ),
    );
  }
}

// ── Summary step ─────────────────────────────────────────────────────────────

class _SummaryStepBody extends StatelessWidget {
  final CheckoutSummaryStep state;

  const _SummaryStepBody({required this.state});

  @override
  Widget build(BuildContext context) {
    final total = state.promoPreview?.total ?? state.cart.subtotal;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          context
              .read<CheckoutBloc>()
              .add(const CheckoutBackToAddress());
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Checkout'),
          leading: BackButton(
            onPressed: () => context
                .read<CheckoutBloc>()
                .add(const CheckoutBackToAddress()),
          ),
        ),
        body: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.base,
                  AppSpacing.base,
                  AppSpacing.base,
                  AppSpacing.xl,
                ),
                child: const CheckoutStepIndicator(currentStep: 2),
              ),
            ),
            // Delivery address card
            SliverToBoxAdapter(
              child: _DeliveryAddressCard(address: state.selectedAddress),
            ),
            // Order items
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.base,
                  AppSpacing.base,
                  AppSpacing.base,
                  AppSpacing.xs,
                ),
                child: Text('Your Items', style: AppTextStyles.h5),
              ),
            ),
            SliverToBoxAdapter(
              child: OrderSummarySection(cart: state.cart),
            ),
            // Price summary
            SliverToBoxAdapter(
              child: CheckoutPriceSummary(
                cart: state.cart,
                promoPreview: state.promoPreview,
              ),
            ),
            // Promo disclaimer — the preview total was computed when the
            // promo was applied; the backend is authoritative at charge time.
            if (state.promoPreview != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.base,
                  ),
                  child: Text(
                    'Prices confirmed at checkout. Discount subject to promo terms.',
                    style: AppTextStyles.caption
                        .copyWith(color: AppColors.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.base,
              AppSpacing.sm,
              AppSpacing.base,
              AppSpacing.base,
            ),
            child: ElevatedButton(
              onPressed: () => context
                  .read<CheckoutBloc>()
                  .add(const CheckoutProceedToPayment()),
              style: ElevatedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(vertical: AppSpacing.md),
              ),
              child: Text('Pay \$${total.toStringAsFixed(2)}'),
            ),
          ),
        ),
      ),
    );
  }
}

class _DeliveryAddressCard extends StatelessWidget {
  final AddressModel address;

  const _DeliveryAddressCard({required this.address});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.base),
      padding: const EdgeInsets.all(AppSpacing.base),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.location_on_outlined,
              color: AppColors.primary, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Delivering to',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  address.fullName,
                  style: AppTextStyles.body
                      .copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  address.singleLine,
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shared sub-widgets ────────────────────────────────────────────────────────

class _LoadingScaffold extends StatelessWidget {
  final String title;
  final String? message;

  const _LoadingScaffold({required this.title, this.message});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(title: Text(title), automaticallyImplyLeading: false),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              if (message != null) ...[
                const SizedBox(height: AppSpacing.base),
                Text(message!, style: AppTextStyles.body),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  final CheckoutError state;

  const _ErrorBody({required this.state});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline,
                  size: 64, color: AppColors.error),
              const SizedBox(height: AppSpacing.base),
              Text('Something went wrong', style: AppTextStyles.h5),
              const SizedBox(height: AppSpacing.sm),
              Text(
                state.message,
                style: AppTextStyles.body
                    .copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton(
                onPressed: () => context
                    .read<CheckoutBloc>()
                    .add(const CheckoutRetried()),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
