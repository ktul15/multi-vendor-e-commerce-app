import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/product_moderation_cubit.dart';
import '../bloc/product_moderation_state.dart';
import '../models/admin_product_model.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../widgets/product_moderation_skeleton.dart';
import '../widgets/product_status_badge.dart';

class ProductModerationListPage extends StatefulWidget {
  const ProductModerationListPage({super.key});

  @override
  State<ProductModerationListPage> createState() =>
      _ProductModerationListPageState();
}

class _ProductModerationListPageState
    extends State<ProductModerationListPage> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      _doWithSnackbar(
          () => context.read<ProductModerationCubit>().search(value));
    });
  }

  Future<void> _doWithSnackbar(Future<String?> Function() action) async {
    final error = await action();
    if (error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Products')),
      body: BlocBuilder<ProductModerationCubit, ProductModerationState>(
        builder: (context, state) {
          return switch (state) {
            ProductModerationInitial() ||
            ProductModerationLoading() =>
              const SkeletonContainer(child: ProductModerationSkeleton()),
            ProductModerationError(:final message) => ErrorState(
                message: message,
                onRetry: () =>
                    context.read<ProductModerationCubit>().load(),
              ),
            ProductModerationLoaded() => _LoadedBody(
                state: state,
                searchController: _searchController,
                onSearchChanged: _onSearchChanged,
                onDoWithSnackbar: _doWithSnackbar,
              ),
          };
        },
      ),
    );
  }
}

// ── Loaded body ───────────────────────────────────────────────────────────────

class _LoadedBody extends StatelessWidget {
  final ProductModerationLoaded state;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _LoadedBody({
    required this.state,
    required this.searchController,
    required this.onSearchChanged,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => context.read<ProductModerationCubit>().refresh(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Toolbar(
                  searchController: searchController,
                  onSearchChanged: onSearchChanged,
                ),
                const SizedBox(height: 12),
                _StatusFilterBar(
                  statusFilter: state.statusFilter,
                  onFilterChanged: (isActive) => onDoWithSnackbar(
                    () => context
                        .read<ProductModerationCubit>()
                        .filterByStatus(isActive),
                  ),
                ),
                const SizedBox(height: 16),
                _ProductTable(
                  state: state,
                  onDoWithSnackbar: onDoWithSnackbar,
                ),
                const SizedBox(height: 12),
                _PaginationBar(
                  state: state,
                  onDoWithSnackbar: onDoWithSnackbar,
                ),
              ],
            ),
          ),
        ),
        // Translucent overlay while a page/filter/search fetch is in flight.
        if (state.isRefreshing)
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0x33FFFFFF),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
          ),
      ],
    );
  }
}

// ── Toolbar (search) ──────────────────────────────────────────────────────────

class _Toolbar extends StatelessWidget {
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;

  const _Toolbar({
    required this.searchController,
    required this.onSearchChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 320,
      child: TextField(
        controller: searchController,
        onChanged: onSearchChanged,
        decoration: InputDecoration(
          hintText: 'Search by name…',
          prefixIcon: const Icon(
            Icons.search_rounded,
            size: 20,
            color: AppColors.textSecondary,
          ),
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: searchController,
            builder: (context, value, child) {
              if (value.text.isEmpty) return const SizedBox.shrink();
              return IconButton(
                icon: const Icon(Icons.clear_rounded, size: 18),
                onPressed: () {
                  searchController.clear();
                  onSearchChanged('');
                },
              );
            },
          ),
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 10,
          ),
        ),
      ),
    );
  }
}

// ── Status filter chips ───────────────────────────────────────────────────────

class _StatusFilterBar extends StatelessWidget {
  final bool? statusFilter;
  final Future<void> Function(bool?) onFilterChanged;

  const _StatusFilterBar({
    required this.statusFilter,
    required this.onFilterChanged,
  });

  @override
  Widget build(BuildContext context) {
    // null = All, true = Active, false = Inactive
    const filters = <({bool? value, String label})>[
      (value: null, label: 'All'),
      (value: true, label: 'Active'),
      (value: false, label: 'Inactive'),
    ];
    return Wrap(
      spacing: 8,
      children: [
        for (final f in filters)
          FilterChip(
            label: Text(f.label),
            selected: statusFilter == f.value,
            onSelected: (_) => onFilterChanged(f.value),
            showCheckmark: false,
            selectedColor: AppColors.primary,
            labelStyle: TextStyle(
              color: statusFilter == f.value
                  ? Colors.white
                  : AppColors.textPrimary,
              fontSize: 13,
              fontWeight: statusFilter == f.value
                  ? FontWeight.w600
                  : FontWeight.w400,
            ),
            side: BorderSide(
              color: statusFilter == f.value
                  ? AppColors.primary
                  : AppColors.border,
            ),
            backgroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 4),
          ),
      ],
    );
  }
}

// ── Product DataTable ─────────────────────────────────────────────────────────

class _ProductTable extends StatelessWidget {
  final ProductModerationLoaded state;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _ProductTable({
    required this.state,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    if (state.items.isEmpty && !state.isRefreshing) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 64),
          child: Center(
            child: Column(
              children: [
                Icon(
                  Icons.inventory_2_outlined,
                  size: 64,
                  color: AppColors.textSecondary.withAlpha(100),
                ),
                const SizedBox(height: 16),
                Text(
                  'No products found',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columnSpacing: 28,
          headingRowColor: WidgetStateProperty.all(AppColors.background),
          columns: const [
            DataColumn(label: Text('Name')),
            DataColumn(label: Text('Vendor')),
            DataColumn(label: Text('Category')),
            DataColumn(label: Text('Price')),
            DataColumn(label: Text('Status')),
            DataColumn(label: Text('Rating')),
            DataColumn(label: Text('Created')),
            DataColumn(label: Text('Actions')),
          ],
          rows: state.items.map((product) {
            final isActioning = state.actioningIds.contains(product.id);
            return DataRow(
              cells: [
                // Product name — tappable to open detail
                DataCell(
                  InkWell(
                    onTap: () => context.goNamed(
                      AppRoutes.productDetailName,
                      pathParameters: {'id': product.id},
                    ),
                    child: Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                        decoration: TextDecoration.underline,
                        decorationColor: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                // Vendor
                DataCell(
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.vendor.name,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        product.vendor.email,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                // Category
                DataCell(Text(product.category.name)),
                // Price
                DataCell(
                  Text(
                    product.formattedPrice,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                // Status badge
                DataCell(ProductStatusBadge(isActive: product.isActive)),
                // Rating
                DataCell(
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 14,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        product.avgRating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                ),
                // Created date
                DataCell(
                  Text(
                    product.formattedDate,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                // Action buttons
                DataCell(
                  isActioning
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        )
                      : _ActionButtons(
                          product: product,
                          onDoWithSnackbar: onDoWithSnackbar,
                        ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ── Per-row action buttons ────────────────────────────────────────────────────

class _ActionButtons extends StatelessWidget {
  final AdminProductModel product;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _ActionButtons({
    required this.product,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!product.isActive) ...[
          _ActionButton(
            label: 'Activate',
            color: AppColors.success,
            onTap: () => _confirm(
              context,
              action: 'Activate',
              body:
                  '"${product.name}" will be made visible to customers.',
              actionColor: AppColors.success,
              onConfirm: () => onDoWithSnackbar(
                () => context
                    .read<ProductModerationCubit>()
                    .activateProduct(product),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
        if (product.isActive) ...[
          _ActionButton(
            label: 'Deactivate',
            color: AppColors.warning,
            onTap: () => _confirm(
              context,
              action: 'Deactivate',
              body:
                  '"${product.name}" will be hidden from customers.',
              actionColor: AppColors.warning,
              onConfirm: () => onDoWithSnackbar(
                () => context
                    .read<ProductModerationCubit>()
                    .deactivateProduct(product),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
        _ActionButton(
          label: 'Delete',
          color: AppColors.error,
          onTap: () => _confirm(
            context,
            action: 'Delete',
            body:
                '"${product.name}" will be permanently deleted. This cannot be undone. Products with existing orders cannot be deleted.',
            actionColor: AppColors.error,
            onConfirm: () => onDoWithSnackbar(
              () => context
                  .read<ProductModerationCubit>()
                  .deleteProduct(product),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _confirm(
    BuildContext context, {
    required String action,
    required String body,
    required Color actionColor,
    required Future<void> Function() onConfirm,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => _ConfirmDialog(
        productName: product.name,
        action: action,
        body: body,
        actionColor: actionColor,
      ),
    );
    if (confirmed == true && context.mounted) {
      await onConfirm();
    }
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color.withAlpha(120)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        minimumSize: const Size(0, 32),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
      ),
      child: Text(label),
    );
  }
}

// ── Pagination bar ────────────────────────────────────────────────────────────

class _PaginationBar extends StatelessWidget {
  final ProductModerationLoaded state;
  final Future<void> Function(Future<String?> Function()) onDoWithSnackbar;

  const _PaginationBar({
    required this.state,
    required this.onDoWithSnackbar,
  });

  @override
  Widget build(BuildContext context) {
    if (state.total == 0) return const SizedBox.shrink();

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          'Showing ${state.fromItem}–${state.toItem} of ${state.total}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(width: 16),
        IconButton(
          tooltip: 'Previous page',
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: state.hasPrevPage && !state.isRefreshing
              ? () => onDoWithSnackbar(
                    () => context.read<ProductModerationCubit>().prevPage(),
                  )
              : null,
        ),
        Text(
          'Page ${state.page} of ${state.totalPages}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        IconButton(
          tooltip: 'Next page',
          icon: const Icon(Icons.chevron_right_rounded),
          onPressed: state.hasNextPage && !state.isRefreshing
              ? () => onDoWithSnackbar(
                    () => context.read<ProductModerationCubit>().nextPage(),
                  )
              : null,
        ),
      ],
    );
  }
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

class _ConfirmDialog extends StatelessWidget {
  final String productName;
  final String action;
  final String body;
  final Color actionColor;

  const _ConfirmDialog({
    required this.productName,
    required this.action,
    required this.body,
    required this.actionColor,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('$action "$productName"?'),
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
    );
  }
}

