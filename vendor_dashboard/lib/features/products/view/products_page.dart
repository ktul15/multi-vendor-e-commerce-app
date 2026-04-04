import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/injection_container.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../features/auth/bloc/auth_bloc.dart';
import '../../../features/auth/bloc/auth_state.dart';
import '../../../shared/models/product.dart';
import '../bloc/products_cubit.dart';
import '../bloc/products_state.dart';
import '../widgets/products_table.dart';
import '../widgets/product_form_dialog.dart';

class ProductsPage extends StatelessWidget {
  const ProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final vendorId = authState is AuthAuthenticated
        ? (authState.user['id'] as String?) ?? ''
        : '';

    if (vendorId.isEmpty) {
      return const Scaffold(
        body: Center(child: Text('Unable to determine vendor account.')),
      );
    }

    return BlocProvider(
      create: (_) => sl<ProductsCubit>(param1: vendorId)..load(),
      child: const _ProductsView(),
    );
  }
}

class _ProductsView extends StatelessWidget {
  const _ProductsView();

  Future<void> _showCreateDialog(BuildContext context) async {
    final result = await showDialog<ProductFormResult>(
      context: context,
      builder: (_) => const ProductFormDialog(),
    );
    if (result != null && context.mounted) {
      await context.read<ProductsCubit>().createProduct(
            name: result.name,
            description: result.description,
            basePrice: result.basePrice,
            categoryId: result.categoryId,
            isActive: result.isActive,
          );
    }
  }

  Future<void> _showEditDialog(
    BuildContext context,
    Product product,
  ) async {
    final result = await showDialog<ProductFormResult>(
      context: context,
      builder: (_) => ProductFormDialog(product: product),
    );
    if (result != null && context.mounted) {
      await context.read<ProductsCubit>().updateProduct(
            product.id,
            name: result.name,
            description: result.description,
            basePrice: result.basePrice,
            isActive: result.isActive,
          );
    }
  }

  Future<void> _confirmDelete(BuildContext context, Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Delete "${product.name}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      await context.read<ProductsCubit>().deleteProduct(product.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocConsumer<ProductsCubit, ProductsState>(
        listener: (context, state) {
          if (state is ProductsError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          return Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Products', style: AppTextStyles.h2),
                    FilledButton.icon(
                      onPressed: state is ProductsLoading
                          ? null
                          : () => _showCreateDialog(context),
                      icon: const Icon(Icons.add),
                      label: const Text('New Product'),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                Expanded(
                  child: Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.border),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: switch (state) {
                        ProductsLoading() || ProductsInitial() =>
                          const Center(child: CircularProgressIndicator()),
                        ProductsError(:final message) => Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(message),
                                const SizedBox(height: AppSpacing.md),
                                ElevatedButton(
                                  onPressed: () =>
                                      context.read<ProductsCubit>().load(),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          ),
                        ProductsLoaded(:final products, :final hasMore, :final total) =>
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (total > 0)
                                Padding(
                                  padding: const EdgeInsets.only(
                                    bottom: AppSpacing.sm,
                                  ),
                                  child: Text(
                                    'Showing ${products.length} of $total',
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ),
                              Expanded(
                                child: SingleChildScrollView(
                                  child: Column(
                                    children: [
                                      ProductsTable(
                                        products: products,
                                        onEdit: (p) =>
                                            _showEditDialog(context, p),
                                        onDelete: (p) =>
                                            _confirmDelete(context, p),
                                      ),
                                      if (hasMore)
                                        Padding(
                                          padding: const EdgeInsets.all(
                                            AppSpacing.md,
                                          ),
                                          child: OutlinedButton(
                                            onPressed: () => context
                                                .read<ProductsCubit>()
                                                .loadMore(),
                                            child: const Text('Load more'),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        _ => const SizedBox(),
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
