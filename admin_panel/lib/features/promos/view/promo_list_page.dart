import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/empty_state.dart';
import '../bloc/promo_cubit.dart';
import '../bloc/promo_state.dart';
import '../models/promo_model.dart';
import '../widgets/promo_list_skeleton.dart';

class PromoListPage extends StatefulWidget {
  const PromoListPage({super.key});

  @override
  State<PromoListPage> createState() => _PromoListPageState();
}

class _PromoListPageState extends State<PromoListPage> {
  final _searchController = TextEditingController();
  bool _searchInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_searchInitialized) return;
    _searchInitialized = true;
    // Sync controller text with any active search query already in the cubit
    // (e.g., navigating back to this page after a search was already active).
    final state = context.read<PromoCubit>().state;
    if (state is PromoLoaded && state.searchQuery != null) {
      _searchController.text = state.searchQuery!;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Promo Codes'),
        actions: [
          BlocBuilder<PromoCubit, PromoState>(
            buildWhen: (p, n) =>
                (p is PromoLoaded) != (n is PromoLoaded) ||
                (p is PromoLoaded &&
                    n is PromoLoaded &&
                    p.isSubmitting != n.isSubmitting),
            builder: (context, state) {
              return FilledButton.icon(
                onPressed: (state is PromoLoaded && state.isSubmitting)
                    ? null
                    : () => context.pushNamed(AppRoutes.promoCreateName),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Add Promo'),
              );
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: BlocConsumer<PromoCubit, PromoState>(
        listenWhen: (p, n) =>
            (n is PromoLoaded && n.transientError != null) ||
            n is PromoError ||
            (p is PromoLoaded &&
                n is PromoLoaded &&
                p.searchQuery != n.searchQuery),
        listener: (context, state) {
          // Keep search controller text in sync with cubit state so the clear
          // button and input field always reflect the active query.
          if (state is PromoLoaded) {
            final desired = state.searchQuery ?? '';
            if (_searchController.text != desired) {
              _searchController.text = desired;
            }
          }
          if (state is PromoLoaded && state.transientError != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.transientError!),
                backgroundColor: AppColors.error,
              ),
            );
            context.read<PromoCubit>().clearTransientError();
          } else if (state is PromoError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is PromoInitial || state is PromoLoading) {
            return const SkeletonContainer(child: PromoListSkeleton());
          }

          if (state is PromoError) {
            return ErrorState(
              message: state.message,
              onRetry: () => context.read<PromoCubit>().load(),
            );
          }

          if (state is PromoLoaded) {
            if (state.items.isEmpty &&
                !state.isRefreshing &&
                state.searchQuery == null &&
                state.isActiveFilter == null &&
                state.discountTypeFilter == null) {
              return const EmptyState(
                icon: Icons.discount_outlined,
                title: 'No promo codes yet',
                subtitle: 'Add your first promo code to get started.',
              );
            }
            return _LoadedView(
              loaded: state,
              searchController: _searchController,
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}

// ── Loaded view ───────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  final PromoLoaded loaded;
  final TextEditingController searchController;

  const _LoadedView({
    required this.loaded,
    required this.searchController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Filter / search bar ─────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
          child: Row(
            children: [
              // Search field
              SizedBox(
                width: 220,
                child: TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    hintText: 'Search code…',
                    prefixIcon: const Icon(Icons.search_rounded, size: 18),
                    isDense: true,
                    suffixIcon: searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 16),
                            onPressed: () {
                              searchController.clear();
                              context.read<PromoCubit>().search(null);
                            },
                          )
                        : null,
                  ),
                  onSubmitted: (v) =>
                      context.read<PromoCubit>().search(v.isEmpty ? null : v),
                  textInputAction: TextInputAction.search,
                ),
              ),
              const SizedBox(width: 12),
              // Status filter
              _FilterChip(
                label: 'All',
                selected: loaded.isActiveFilter == null,
                onSelected: (_) =>
                    context.read<PromoCubit>().filterByActive(null),
              ),
              const SizedBox(width: 6),
              _FilterChip(
                label: 'Active',
                selected: loaded.isActiveFilter == true,
                onSelected: (_) =>
                    context.read<PromoCubit>().filterByActive(true),
              ),
              const SizedBox(width: 6),
              _FilterChip(
                label: 'Inactive',
                selected: loaded.isActiveFilter == false,
                onSelected: (_) =>
                    context.read<PromoCubit>().filterByActive(false),
              ),
              const SizedBox(width: 12),
              // Discount type filter
              _FilterChip(
                label: '%',
                selected: loaded.discountTypeFilter == 'PERCENTAGE',
                onSelected: (sel) => context.read<PromoCubit>().filterByDiscountType(
                      sel ? 'PERCENTAGE' : null,
                    ),
              ),
              const SizedBox(width: 6),
              _FilterChip(
                label: 'Fixed',
                selected: loaded.discountTypeFilter == 'FIXED',
                onSelected: (sel) => context.read<PromoCubit>().filterByDiscountType(
                      sel ? 'FIXED' : null,
                    ),
              ),
              const Spacer(),
              if (loaded.isRefreshing || loaded.isSubmitting)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                ),
            ],
          ),
        ),

        // ── Data table ──────────────────────────────────────────────────
        Expanded(
          child: loaded.items.isEmpty
              ? Center(
                  child: Text(
                    'No promo codes match your filters.',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textSecondary),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Card(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: DataTable(
                        columnSpacing: 24,
                        columns: const [
                          DataColumn(label: Text('Code')),
                          DataColumn(label: Text('Discount')),
                          DataColumn(label: Text('Min Order')),
                          DataColumn(label: Text('Usage')),
                          DataColumn(label: Text('Expires')),
                          DataColumn(label: Text('Active')),
                          DataColumn(label: Text('Actions')),
                        ],
                        rows: loaded.items.map((promo) {
                          return DataRow(cells: [
                            // Code
                            DataCell(
                              Text(
                                promo.code,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            // Discount
                            DataCell(Text(promo.formattedDiscount)),
                            // Min order
                            DataCell(
                              Text(
                                promo.minOrderValue != null
                                    ? '\$${promo.minOrderValue!.toStringAsFixed(2)}'
                                    : '—',
                                style: TextStyle(
                                    color: promo.minOrderValue == null
                                        ? AppColors.textSecondary
                                        : null),
                              ),
                            ),
                            // Usage
                            DataCell(
                              Text(
                                promo.usageLimit != null
                                    ? '${promo.usageCount} / ${promo.usageLimit}'
                                    : '${promo.usageCount} / ∞',
                              ),
                            ),
                            // Expires
                            DataCell(
                              Text(
                                promo.expiresAt != null
                                    ? DateFormat('MMM d, y')
                                        .format(promo.expiresAt!.toLocal())
                                    : 'Never',
                                style: TextStyle(
                                  color: promo.expiresAt != null &&
                                          promo.expiresAt!
                                              .isBefore(DateTime.now())
                                      ? AppColors.error
                                      : promo.expiresAt == null
                                          ? AppColors.textSecondary
                                          : null,
                                ),
                              ),
                            ),
                            // Active toggle
                            DataCell(
                              Switch(
                                value: promo.isActive,
                                onChanged: loaded.isSubmitting
                                    ? null
                                    : (v) => _doWithSnackbar(
                                          context,
                                          () => context
                                              .read<PromoCubit>()
                                              .togglePromo(
                                                promo.id,
                                                newIsActive: v,
                                              ),
                                        ),
                              ),
                            ),
                            // Actions
                            DataCell(
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    tooltip: 'Edit',
                                    icon: const Icon(Icons.edit_outlined,
                                        size: 18),
                                    onPressed: loaded.isSubmitting
                                        ? null
                                        : () => context.pushNamed(
                                              AppRoutes.promoEditName,
                                              pathParameters: {
                                                'id': promo.id
                                              },
                                            ),
                                  ),
                                  IconButton(
                                    tooltip: 'Delete',
                                    icon: Icon(
                                      Icons.delete_outline_rounded,
                                      size: 18,
                                      color: loaded.isSubmitting
                                          ? null
                                          : AppColors.error,
                                    ),
                                    onPressed: loaded.isSubmitting
                                        ? null
                                        : () => _onDelete(context, promo),
                                  ),
                                ],
                              ),
                            ),
                          ]);
                        }).toList(),
                      ),
                    ),
                  ),
                ),
        ),

        // ── Pagination bar ──────────────────────────────────────────────
        if (loaded.meta.totalPages > 1)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: _PaginationBar(loaded: loaded),
          ),
      ],
    );
  }

  Future<void> _onDelete(BuildContext context, PromoModel promo) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Promo Code'),
        content: Text(
          'Delete promo code "${promo.code}"?\n\nNote: codes with order history are soft-deleted (deactivated).',
        ),
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
    if (confirmed != true || !context.mounted) return;
    await _doWithSnackbar(
      context,
      () => context.read<PromoCubit>().deletePromo(promo.id),
      successMessage: 'Promo code deleted',
    );
  }

  static Future<void> _doWithSnackbar(
    BuildContext context,
    Future<String?> Function() action, {
    String? successMessage,
  }) async {
    final error = await action();
    if (!context.mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error),
          backgroundColor: AppColors.error,
        ),
      );
    } else if (successMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(successMessage)),
      );
    }
  }
}

// ── Pagination bar ────────────────────────────────────────────────────────────

class _PaginationBar extends StatelessWidget {
  final PromoLoaded loaded;

  const _PaginationBar({required this.loaded});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Text(
          '${loaded.fromItem}–${loaded.toItem} of ${loaded.meta.total}',
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(width: 16),
        IconButton(
          tooltip: 'Previous page',
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: loaded.hasPrevPage && !loaded.isRefreshing
              ? () => _doWithSnackbar(
                    context,
                    () => context.read<PromoCubit>().prevPage(),
                  )
              : null,
        ),
        Text(
          '${loaded.meta.page} / ${loaded.meta.totalPages}',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        IconButton(
          tooltip: 'Next page',
          icon: const Icon(Icons.chevron_right_rounded),
          onPressed: loaded.hasNextPage && !loaded.isRefreshing
              ? () => _doWithSnackbar(
                    context,
                    () => context.read<PromoCubit>().nextPage(),
                  )
              : null,
        ),
      ],
    );
  }

  static Future<void> _doWithSnackbar(
    BuildContext context,
    Future<String?> Function() action,
  ) async {
    final error = await action();
    if (!context.mounted || error == null) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error),
        backgroundColor: AppColors.error,
      ),
    );
  }
}

// ── Filter chip ───────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final void Function(bool) onSelected;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      visualDensity: VisualDensity.compact,
    );
  }
}

