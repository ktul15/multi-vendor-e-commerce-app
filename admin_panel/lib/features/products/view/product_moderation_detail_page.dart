import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/product_moderation_cubit.dart';
import '../bloc/product_moderation_state.dart';
import '../models/admin_product_model.dart';
import '../widgets/product_status_badge.dart';

class ProductModerationDetailPage extends StatefulWidget {
  final String productId;

  const ProductModerationDetailPage({super.key, required this.productId});

  @override
  State<ProductModerationDetailPage> createState() =>
      _ProductModerationDetailPageState();
}

class _ProductModerationDetailPageState
    extends State<ProductModerationDetailPage> {
  @override
  void initState() {
    super.initState();
    // Ensure products are loaded in case the user deep-linked directly here.
    context.read<ProductModerationCubit>().ensureLoaded();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductModerationCubit, ProductModerationState>(
      builder: (context, state) {
        return switch (state) {
          ProductModerationInitial() ||
          ProductModerationLoading() =>
            Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(title: const Text('Product Detail')),
              body: const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
          ProductModerationError(:final message) => Scaffold(
              backgroundColor: Colors.transparent,
              appBar: AppBar(title: const Text('Product Detail')),
              body: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 64, color: AppColors.error),
                    const SizedBox(height: 16),
                    Text(
                      message,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    FilledButton.icon(
                      onPressed: () =>
                          context.read<ProductModerationCubit>().load(),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ProductModerationLoaded() => _buildDetail(context, state),
        };
      },
    );
  }

  Widget _buildDetail(BuildContext context, ProductModerationLoaded state) {
    final product =
        state.items.where((p) => p.id == widget.productId).firstOrNull;

    if (product == null) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Product Detail')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.inventory_2_outlined,
                  size: 64, color: AppColors.textSecondary),
              const SizedBox(height: 16),
              Text(
                'Product not found',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () =>
                    context.goNamed(AppRoutes.productsName),
                child: const Text('Back to Products'),
              ),
            ],
          ),
        ),
      );
    }

    final isActioning = state.actioningIds.contains(product.id);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: Text(product.name)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ──────────────────────────────────────────────────────
            Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: AppColors.primary.withAlpha(20),
                      child: Text(
                        product.name.isNotEmpty
                            ? product.name[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.name,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 6),
                          ProductStatusBadge(isActive: product.isActive),
                        ],
                      ),
                    ),
                    // Contextual action buttons
                    if (isActioning)
                      const Padding(
                        padding: EdgeInsets.all(8),
                        child: SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        ),
                      )
                    else
                      _DetailActions(product: product),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Two-column info cards ────────────────────────────────────────
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _InfoCard(
                  title: 'Product Details',
                  children: [
                    _InfoRow(
                      label: 'Base Price',
                      value: product.formattedPrice,
                    ),
                    _InfoRow(
                      label: 'Category',
                      value: product.category.name,
                    ),
                    _InfoRow(
                      label: 'Avg Rating',
                      value: product.avgRating.toStringAsFixed(1),
                    ),
                    _InfoRow(
                      label: 'Reviews',
                      value: product.reviewCount.toString(),
                    ),
                    _InfoRow(
                      label: 'Variants',
                      value: product.variantCount.toString(),
                    ),
                    _InfoRow(
                      label: 'Created',
                      value: product.formattedDate,
                    ),
                  ],
                ),
                _InfoCard(
                  title: 'Vendor',
                  children: [
                    _InfoRow(
                      label: 'Name',
                      value: product.vendor.name,
                    ),
                    _InfoRow(
                      label: 'Email',
                      value: product.vendor.email,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Detail action buttons ─────────────────────────────────────────────────────

class _DetailActions extends StatelessWidget {
  final AdminProductModel product;

  const _DetailActions({required this.product});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!product.isActive) ...[
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.success,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onPressed: () => _confirm(
              context,
              action: 'Activate',
              body: '"${product.name}" will be made visible to customers.',
              actionColor: AppColors.success,
              onConfirm: () => context
                  .read<ProductModerationCubit>()
                  .activateProduct(product),
            ),
            child: const Text('Activate'),
          ),
          const SizedBox(width: 8),
        ],
        if (product.isActive) ...[
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.warning,
              side: const BorderSide(color: AppColors.warning),
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onPressed: () => _confirm(
              context,
              action: 'Deactivate',
              body: '"${product.name}" will be hidden from customers.',
              actionColor: AppColors.warning,
              onConfirm: () => context
                  .read<ProductModerationCubit>()
                  .deactivateProduct(product),
            ),
            child: const Text('Deactivate'),
          ),
          const SizedBox(width: 8),
        ],
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.error,
            side: const BorderSide(color: AppColors.error),
            minimumSize: const Size(0, 36),
            padding: const EdgeInsets.symmetric(horizontal: 16),
          ),
          onPressed: () => _confirm(
            context,
            action: 'Delete',
            body:
                '"${product.name}" will be permanently deleted. Products with existing orders cannot be deleted.',
            actionColor: AppColors.error,
            onConfirm: () => context
                .read<ProductModerationCubit>()
                .deleteProduct(product),
          ),
          child: const Text('Delete'),
        ),
      ],
    );
  }

  Future<void> _confirm(
    BuildContext context, {
    required String action,
    required String body,
    required Color actionColor,
    required Future<String?> Function() onConfirm,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('$action "${product.name}"?'),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: actionColor),
            child: Text(action),
          ),
        ],
      ),
    );
    if (confirmed == true && context.mounted) {
      final error = await onConfirm();
      if (error != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }
}

// ── Reusable info card ────────────────────────────────────────────────────────

class _InfoCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _InfoCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 280, maxWidth: 400),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
              ),
              const SizedBox(height: 16),
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 128,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
