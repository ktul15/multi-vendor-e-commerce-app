import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../bloc/banner_cubit.dart';
import '../bloc/banner_state.dart';
import '../models/banner_model.dart';
import '../../../shared/widgets/skeleton_box.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/empty_state.dart';
import '../widgets/banner_list_skeleton.dart';
import '../widgets/banner_preview_dialog.dart';

class BannerListPage extends StatelessWidget {
  const BannerListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Banners'),
        actions: [
          BlocBuilder<BannerCubit, BannerState>(
            buildWhen: (p, n) =>
                (p is BannerLoaded) != (n is BannerLoaded) ||
                (p is BannerLoaded &&
                    n is BannerLoaded &&
                    p.isSubmitting != n.isSubmitting),
            builder: (context, state) {
              return FilledButton.icon(
                onPressed: (state is BannerLoaded && state.isSubmitting)
                    ? null
                    : () => context.pushNamed(AppRoutes.bannerCreateName),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Add Banner'),
              );
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: BlocConsumer<BannerCubit, BannerState>(
        listenWhen: (p, n) =>
            n is BannerLoaded && n.transientError != null ||
            n is BannerError,
        listener: (context, state) {
          if (state is BannerLoaded && state.transientError != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.transientError!),
                backgroundColor: AppColors.error,
              ),
            );
            context.read<BannerCubit>().clearTransientError();
          } else if (state is BannerError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is BannerInitial || state is BannerLoading) {
            return const SkeletonContainer(child: BannerListSkeleton());
          }

          if (state is BannerError) {
            return ErrorState(
              message: state.message,
              onRetry: () => context.read<BannerCubit>().load(),
            );
          }

          if (state is BannerLoaded) {
            if (state.items.isEmpty && !state.isRefreshing) {
              return const EmptyState(
                icon: Icons.image_outlined,
                title: 'No banners yet',
                subtitle: 'Add your first banner to get started.',
              );
            }
            return _LoadedView(loaded: state);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}

// ── Loaded view ───────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  final BannerLoaded loaded;

  const _LoadedView({required this.loaded});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ── Filter bar ──────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
          child: Row(
            children: [
              Text(
                'Filter:',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(width: 8),
              _FilterChip(
                label: 'All',
                selected: loaded.isActiveFilter == null,
                onSelected: (_) =>
                    context.read<BannerCubit>().filterByActive(null),
              ),
              const SizedBox(width: 6),
              _FilterChip(
                label: 'Active',
                selected: loaded.isActiveFilter == true,
                onSelected: (_) =>
                    context.read<BannerCubit>().filterByActive(true),
              ),
              const SizedBox(width: 6),
              _FilterChip(
                label: 'Inactive',
                selected: loaded.isActiveFilter == false,
                onSelected: (_) =>
                    context.read<BannerCubit>().filterByActive(false),
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

        // ── Reorderable list ────────────────────────────────────────────
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Card(
              child: ReorderableListView.builder(
                padding: EdgeInsets.zero,
                itemCount: loaded.items.length,
                onReorder: (oldIndex, newIndex) {
                  if (newIndex > oldIndex) newIndex--;
                  _doWithSnackbar(
                    context,
                    () => context
                        .read<BannerCubit>()
                        .reorder(oldIndex, newIndex),
                  );
                },
                itemBuilder: (context, index) {
                  final banner = loaded.items[index];
                  return _BannerRow(
                    key: ValueKey(banner.id),
                    banner: banner,
                    index: index,
                    isDisabled: loaded.isSubmitting,
                    onPreview: () =>
                        showBannerPreviewDialog(context, banner: banner),
                    onEdit: () => context.pushNamed(
                      AppRoutes.bannerEditName,
                      pathParameters: {'id': banner.id},
                    ),
                    onDelete: () => _onDelete(context, banner),
                  );
                },
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

  Future<void> _onDelete(BuildContext context, BannerModel banner) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Banner'),
        content: Text('Delete "${banner.title}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    await _doWithSnackbar(
      context,
      () => context.read<BannerCubit>().deleteBanner(banner.id),
      successMessage: 'Banner deleted',
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

// ── Banner row ────────────────────────────────────────────────────────────────

class _BannerRow extends StatelessWidget {
  final BannerModel banner;
  final int index;
  final bool isDisabled;
  final VoidCallback onPreview;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _BannerRow({
    super.key,
    required this.banner,
    required this.index,
    required this.isDisabled,
    required this.onPreview,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: Image.network(
          banner.imageUrl,
          width: 72,
          height: 40,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => Container(
            width: 72,
            height: 40,
            color: AppColors.border,
            child: const Icon(
              Icons.broken_image_outlined,
              size: 16,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ),
      title: Text(
        banner.title,
        style: const TextStyle(fontWeight: FontWeight.w600),
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        banner.linkUrl?.isNotEmpty == true
            ? banner.linkUrl!
            : 'No link',
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 12,
        ),
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Active badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: banner.isActive
                  ? AppColors.success.withAlpha(26)
                  : AppColors.error.withAlpha(26),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(
              banner.isActive ? 'Active' : 'Inactive',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color:
                    banner.isActive ? AppColors.success : AppColors.error,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Position chip
          Text(
            '#${banner.position}',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: 'Preview',
            icon: const Icon(Icons.visibility_outlined, size: 18),
            onPressed: isDisabled ? null : onPreview,
          ),
          IconButton(
            tooltip: 'Edit',
            icon: const Icon(Icons.edit_outlined, size: 18),
            onPressed: isDisabled ? null : onEdit,
          ),
          IconButton(
            tooltip: 'Delete',
            icon: Icon(
              Icons.delete_outline_rounded,
              size: 18,
              color: isDisabled ? null : AppColors.error,
            ),
            onPressed: isDisabled ? null : onDelete,
          ),
          ReorderableDragStartListener(
            index: index,
            child: const Icon(Icons.drag_handle_rounded,
                color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

// ── Pagination bar ────────────────────────────────────────────────────────────

class _PaginationBar extends StatelessWidget {
  final BannerLoaded loaded;

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
                    () => context.read<BannerCubit>().prevPage(),
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
                    () => context.read<BannerCubit>().nextPage(),
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

